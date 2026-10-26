// One-time setup: links a real Spotify account so the bot can read playlist
// contents (Spotify now requires this - app credentials alone aren't enough
// for playlists as of their February 2026 API changes). Run once with:
//   npm run spotify-login
require("dotenv").config();
const http = require("http");
const { save } = require("./utils/db");

const PORT = 8888;
const REDIRECT_URI = `http://127.0.0.1:${PORT}/callback`;
const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error("Add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET to your .env file first.");
  process.exit(1);
}

const authUrl =
  `https://accounts.spotify.com/authorize?response_type=code` +
  `&client_id=${encodeURIComponent(clientId)}` +
  `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;

console.log("\nOpen this URL in your browser and log in with any Spotify account:\n");
console.log(authUrl + "\n");
console.log(`Waiting for you to finish logging in... (listening on ${REDIRECT_URI})`);

const server = http.createServer(async (req, res) => {
  if (!req.url.startsWith("/callback")) {
    res.writeHead(404);
    return res.end();
  }

  const url = new URL(req.url, REDIRECT_URI);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    res.writeHead(400, { "Content-Type": "text/html" });
    res.end(`<h2>Login failed: ${error}</h2>You can close this tab.`);
    console.error("Spotify login failed:", error);
    server.close();
    return process.exit(1);
  }

  try {
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: REDIRECT_URI }).toString(),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.refresh_token) {
      throw new Error(tokenData.error_description || "Spotify didn't return a refresh token.");
    }

    save("spotifyAuth", { refresh_token: tokenData.refresh_token });

    res.writeHead(200, { "Content-Type": "text/html" });
    res.end("<h2>Spotify linked! You can close this tab and go back to your terminal.</h2>");
    console.log("\nDone - Spotify is linked. Playlist links in /play will now work.");
    console.log("Restart your bot (npm start) if it's currently running.\n");
  } catch (err) {
    res.writeHead(500, { "Content-Type": "text/html" });
    res.end("<h2>Something went wrong linking Spotify. Check your terminal.</h2>");
    console.error("Error exchanging code for tokens:", err.message);
  } finally {
    server.close();
    setTimeout(() => process.exit(0), 500);
  }
});

server.listen(PORT);
