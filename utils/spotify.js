// Spotify lookup - reads public track/album/playlist metadata only
// (actual audio is matched and streamed from SoundCloud).
//
// As of Spotify's February 2026 API changes, reading a playlist's contents
// requires a real user-authorized token (not just app client-credentials).
// Single tracks and albums still work with app-only credentials.
// Run `npm run spotify-login` once to enable playlist links - see README.
const { load, save } = require("./db");
const { spawn } = require("node:child_process");
const { Agent } = require("undici");

// On some Windows networks IPv6 routes to Spotify intermittently time out;
// pin Spotify HTTP requests to IPv4 while leaving Discord's networking alone.
const spotifyDispatcher = new Agent({ connect: { family: 4 } });

function curlConfigValue(value) {
  return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, "\\\"").replace(/\r/g, "\\r").replace(/\n/g, "\\n")}"`;
}

function spotifyCurlRequest(url, options, timeoutMs) {
  return new Promise((resolve, reject) => {
    const child = spawn("curl.exe", ["--config", "-"], {
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8").on("data", (chunk) => { stdout += chunk; });
    child.stderr.setEncoding("utf8").on("data", (chunk) => { stderr += chunk; });
    child.once("error", reject);
    child.once("close", (code) => {
      if (code !== 0) {
        const error = new Error(stderr.trim() || `curl exited with code ${code}`);
        error.cause = { code: code === 28 ? "ETIMEDOUT" : "ECONNRESET" };
        return reject(error);
      }

      const marker = "\n__SPOTIFY_HTTP_STATUS__:";
      const markerIndex = stdout.lastIndexOf(marker);
      if (markerIndex < 0) return reject(new Error("Spotify response did not include an HTTP status."));
      const body = stdout.slice(0, markerIndex);
      const status = Number(stdout.slice(markerIndex + marker.length).trim());
      resolve({
        status,
        ok: status >= 200 && status < 300,
        text: async () => body,
        json: async () => JSON.parse(body),
      });
    });

    const headers = Object.entries(options.headers || {}).map(([key, value]) => `header = ${curlConfigValue(`${key}: ${value}`)}`);
    const configLines = [
      `url = ${curlConfigValue(url)}`,
      ...(options.method ? [`request = ${curlConfigValue(options.method)}`] : []),
      ...headers,
      ...(options.body !== undefined ? [`data = ${curlConfigValue(options.body)}`] : []),
      "silent",
      "show-error",
      `max-time = ${timeoutMs / 1000}`,
      `write-out = ${curlConfigValue("\n__SPOTIFY_HTTP_STATUS__:%{http_code}")}`,
    ];
    child.stdin.end(configLines.join("\n"));
  });
}

let cachedAppToken = null;
let appTokenExpiresAt = 0;
let cachedUserToken = null;
let userTokenExpiresAt = 0;

async function spotifyRequest(url, options = {}, { attempts = 2, timeoutMs = 6_000 } = {}) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      if (process.platform === "win32") return await spotifyCurlRequest(url, options, timeoutMs);
      return await fetch(url, {
        ...options,
        dispatcher: spotifyDispatcher,
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      lastError = error;
      const code = error?.cause?.code;
      const retryable = !code || [
        "UND_ERR_CONNECT_TIMEOUT",
        "UND_ERR_HEADERS_TIMEOUT",
        "ECONNRESET",
        "ETIMEDOUT",
        "EAI_AGAIN",
      ].includes(code);
      if (!retryable || attempt === attempts - 1) break;
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
  const code = lastError?.cause?.code || (lastError?.name === "TimeoutError" ? "TIMEOUT" : null);
  const host = new URL(url).hostname;
  throw new Error(`Spotify request to ${host} failed${code ? ` (${code})` : ""}.`);
}

function basicAuthHeader() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Spotify isn't configured - add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET to your .env file.");
  }
  return Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
}

async function getAppAccessToken() {
  if (cachedAppToken && Date.now() < appTokenExpiresAt) return cachedAppToken;

  const res = await spotifyRequest("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuthHeader()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error("Failed to authenticate with Spotify - check your client ID/secret.");

  const data = await res.json();
  cachedAppToken = data.access_token;
  appTokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
  return cachedAppToken;
}

async function getUserAccessToken() {
  if (cachedUserToken && Date.now() < userTokenExpiresAt) return cachedUserToken;

  const auth = load("spotifyAuth");
  if (!auth.refresh_token) return null;

  const res = await spotifyRequest("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuthHeader()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: auth.refresh_token }).toString(),
  });
  if (!res.ok) return null; // fall back to app-only token

  const data = await res.json();
  cachedUserToken = data.access_token;
  userTokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
  if (data.refresh_token) save("spotifyAuth", { refresh_token: data.refresh_token }); // Spotify may rotate it
  return cachedUserToken;
}

// Prefer a linked user account (works for playlists); fall back to app-only
// credentials (works for single tracks/albums) if nothing is linked yet.
function parseSpotifyUrl(url) {
  const match = url.match(/open\.spotify\.com\/(track|album|playlist)\/([a-zA-Z0-9]+)/);
  if (!match) return null;
  return { type: match[1], id: match[2] };
}

async function spotifyFetch(endpoint) {
  // Only playlist contents need user authorization; track/album metadata uses
  // the app token directly and avoids an unnecessary refresh-token request.
  const token = endpoint.startsWith("/playlists/")
    ? await getUserAccessToken().catch(() => null) || await getAppAccessToken()
    : await getAppAccessToken();
  const res = await spotifyRequest(`https://api.spotify.com/v1${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Spotify API error (${res.status})${body ? `: ${body}` : ""}`);
  }
  return res.json();
}

async function getTrack(id) {
  try {
    const data = await spotifyFetch(`/tracks/${id}`);
    return { name: data.name, artist: data.artists.map((a) => a.name).join(", ") };
  } catch (apiError) {
    // Spotify's public oEmbed endpoint can provide a track title when Web API
    // authentication or the API network route is temporarily unavailable.
    try {
      const url = `https://open.spotify.com/oembed?url=${encodeURIComponent(`https://open.spotify.com/track/${id}`)}`;
      const response = await spotifyRequest(url, {}, { attempts: 1, timeoutMs: 6_000 });
      if (!response.ok) throw apiError;
      const data = await response.json();
      if (!data.title) throw apiError;
      console.warn(`[Spotify] Used oEmbed title fallback for track ${id}.`);
      return { name: data.title, artist: "" };
    } catch {
      throw apiError;
    }
  }
}

async function getAlbumTracks(id, limit = 25) {
  const data = await spotifyFetch(`/albums/${id}/tracks?limit=${limit}`);
  return data.items.map((t) => ({ name: t.name, artist: t.artists.map((a) => a.name).join(", ") }));
}

async function getPlaylistTracks(id, limit = 25) {
  // February 2026: /playlists/{id}/tracks was renamed to /playlists/{id}/items,
  // and each entry's `track` field was renamed to `item` (both are handled below
  // since Spotify sends `track` too during their deprecation window).
  const data = await spotifyFetch(`/playlists/${id}/items?limit=${limit}`);
  return data.items
    .map((entry) => entry.item || entry.track)
    .filter(Boolean)
    .map((t) => ({ name: t.name, artist: (t.artists || []).map((a) => a.name).join(", ") }));
}

module.exports = { parseSpotifyUrl, getTrack, getAlbumTracks, getPlaylistTracks };
