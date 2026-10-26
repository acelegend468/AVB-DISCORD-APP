const YouTube = require("youtube-sr").default;

// Turns a search query into a confirmed-playable YouTube URL.
// play-dl search results don't always carry a full `.url`, and occasionally
// the top result isn't a normal playable video at all - so this checks a
// few candidates in order and validates each one before trusting it.
function toWatchUrl(result) {
  if (!result) return null;
  const candidate = result.url || (result.id ? `https://www.youtube.com/watch?v=${result.id}` : null);
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    const hosts = ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "www.youtu.be"];
    return url.protocol === "https:" && hosts.includes(url.hostname) ? url.toString() : null;
  } catch {
    return null;
  }
}

async function findPlayableSong(play, query, { limit = 4, titleFallback, fallbackSearch } = {}) {
  let results = [];
  let primaryError = null;
  try {
    results = await play.search(query, { limit, source: { youtube: "video" } });
  } catch (err) {
    primaryError = err;
  }

  const toSong = (items, validateWithPlayDl) => {
    for (const result of items || []) {
      const url = toWatchUrl(result);
      if (!url || (validateWithPlayDl && play.yt_validate(url) !== "video")) continue;
      return { title: result.title || titleFallback || query, url };
    }
    return null;
  };

  const primarySong = toSong(results, true);
  if (primarySong) return { song: primarySong, error: null };

  // play-dl's search endpoint can intermittently fail parsing YouTube results.
  // Fall back to youtube-sr so one search-parser failure doesn't break /play or Spotify matching.
  try {
    const fallbackResults = await YouTube.search(query, { limit });
    const fallbackSong = toSong(fallbackResults, false);
    if (fallbackSong) return { song: fallbackSong, error: null };
  } catch (fallbackError) {
    primaryError ||= fallbackError;
  }

  if (fallbackSearch) {
    try {
      const fallbackResults = await fallbackSearch(query, { limit });
      const fallbackSong = toSong(fallbackResults, false);
      if (fallbackSong) return { song: fallbackSong, error: null };
    } catch (fallbackError) {
      return { song: null, error: fallbackError || primaryError };
    }
  }

  return { song: null, error: primaryError };
}

module.exports = { findPlayableSong, toWatchUrl };

