const path = require("node:path");
const { spawn } = require("node:child_process");
const { DisTubeError, PlayableExtractorPlugin, Playlist, Song } = require("distube");

const ytDlpPath = path.resolve(
  path.dirname(require.resolve("@distube/yt-dlp")),
  "..",
  "bin",
  `yt-dlp${process.platform === "win32" ? ".exe" : ""}`
);

function flagArgs(flags) {
  const args = [];
  for (const [key, value] of Object.entries(flags)) {
    if (value === false || value === undefined || value === null) continue;
    const flag = `--${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;
    if (value === true) args.push(flag);
    else args.push(flag, String(value));
  }
  return args;
}

function browserCookieFlags() {
  const browser = process.env.YTDLP_COOKIES_FROM_BROWSER?.trim();
  // Chromium-family browsers on Windows encrypt their cookie stores with DPAPI;
  // yt-dlp cannot reliably decrypt Brave/Chrome/Edge cookies in this setup.
  // Try public YouTube access without cookies instead of failing before playback.
  if (process.platform === "win32" && /^(brave|chrome|chromium|edge)$/i.test(browser || "")) {
    console.warn(`[Music] Skipping ${browser} cookies on Windows (DPAPI); trying YouTube without browser cookies.`);
    return {};
  }
  return browser ? { cookiesFromBrowser: browser } : {};
}

function describeYtDlpError(error) {
  const message = error?.message || String(error);
  if (/failed to decrypt with DPAPI/i.test(message)) {
    return "yt-dlp can't decrypt this Chromium browser's cookies with Windows DPAPI. Closing the browser won't fix this one. Sign in to YouTube in Firefox, set YTDLP_COOKIES_FROM_BROWSER=firefox in .env, and restart the bot.";
  }
  if (/could not copy (?:chrome|chromium) cookie database/i.test(message)) {
    return "yt-dlp can't read the browser cookie database while the browser is using it. Fully close the browser selected by YTDLP_COOKIES_FROM_BROWSER (including background processes), then try again.";
  }
  return message;
}

function getVideoInfo(url, flags = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(ytDlpPath, [...flagArgs(flags), "--", url], {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      callback(value);
    };
    const timeout = setTimeout(() => {
      child.kill();
      finish(reject, new Error("yt-dlp timed out after 25 seconds."));
    }, 25_000);
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
      if (stdout.length > 25_000_000) {
        child.kill();
        finish(reject, new Error("yt-dlp returned too much metadata."));
      }
    });
    child.stderr.on("data", (chunk) => {
      if (stderr.length < 5000) stderr += chunk.toString();
    });
    child.once("error", (error) => finish(reject, error));
    child.once("close", (code) => {
      if (settled) return;
      if (code !== 0) return finish(reject, new Error(stderr.trim() || `yt-dlp exited with code ${code}`));
      try {
        finish(resolve, JSON.parse(stdout));
      } catch (error) {
        finish(reject, new Error(`Couldn't parse yt-dlp response: ${error.message}. ${stderr.trim()}`));
      }
    });
  });
}

function isPlaylist(info) {
  return Array.isArray(info.entries);
}

class YtDlpSong extends Song {
  constructor(plugin, info, options = {}) {
    super({
      plugin,
      source: info.extractor,
      playFromSource: true,
      id: info.id,
      name: info.title || info.fulltitle,
      url: info.webpage_url || info.original_url || info.url,
      isLive: info.is_live,
      thumbnail: info.thumbnail || info.thumbnails?.[0]?.url,
      duration: info.is_live ? 0 : info.duration,
      uploader: { name: info.uploader, url: info.uploader_url },
      views: info.view_count,
      likes: info.like_count,
      ageRestricted: Boolean(info.age_limit) && info.age_limit >= 18,
    }, options);
  }
}

class YtDlpExtractor extends PlayableExtractorPlugin {
  validate() {
    return true;
  }

  async search(query, { limit = 4 } = {}) {
    let info;
    try {
      info = await getVideoInfo(`ytsearch${limit}:${query}`, {
        ...browserCookieFlags(),
        dumpSingleJson: true,
        flatPlaylist: true,
        noWarnings: true,
        skipDownload: true,
        simulate: true,
      });
    } catch (error) {
      throw new DisTubeError("YTDLP_ERROR", describeYtDlpError(error));
    }

    return (info.entries || []).filter(Boolean).map((entry) => ({
      title: entry.title || entry.fulltitle || query,
      url: entry.webpage_url || entry.original_url || (entry.id ? `https://www.youtube.com/watch?v=${entry.id}` : entry.url),
      id: entry.id,
    }));
  }

  async resolve(url, options) {
    let info;
    try {
      info = await getVideoInfo(url, {
        ...browserCookieFlags(),
        dumpSingleJson: true,
        noWarnings: true,
        preferFreeFormats: true,
        skipDownload: true,
        simulate: true,
      });
    } catch (error) {
      throw new DisTubeError("YTDLP_ERROR", describeYtDlpError(error));
    }

    if (!isPlaylist(info)) return new YtDlpSong(this, info, options);
    if (!info.entries.length) throw new DisTubeError("YTDLP_ERROR", "The playlist is empty.");
    return new Playlist({
      source: info.extractor,
      songs: info.entries.filter(Boolean).map((entry) => new YtDlpSong(this, entry, options)),
      id: String(info.id || ""),
      name: info.title,
      url: info.webpage_url,
      thumbnail: info.thumbnails?.[0]?.url,
    }, options);
  }

  async getStreamURL(song) {
    if (!song.url) throw new DisTubeError("YTDLP_PLUGIN_INVALID_SONG", "Cannot get stream URL for this song.");
    let info;
    try {
      info = await getVideoInfo(song.url, {
        ...browserCookieFlags(),
        dumpSingleJson: true,
        noWarnings: true,
        preferFreeFormats: true,
        skipDownload: true,
        simulate: true,
        format: "ba/ba*",
      });
    } catch (error) {
      throw new DisTubeError("YTDLP_ERROR", describeYtDlpError(error));
    }
    if (isPlaylist(info) || !info.url) throw new DisTubeError("YTDLP_ERROR", "No playable audio stream was returned.");
    return info.url;
  }

  getRelatedSongs() {
    return [];
  }
}

module.exports = { YtDlpExtractor };
