const config = require("../config");

function containsBannedWord(content) {
  const lower = content.toLowerCase();
  return config.automod.bannedWords.some((w) => lower.includes(w.toLowerCase()));
}

function tooManyMentions(message) {
  return message.mentions.users.size > config.automod.maxMentions;
}

// In-memory spam tracker (resets on bot restart - fine for most small/medium servers)
const recentMessages = new Map();

function isSpamming(userId) {
  const now = Date.now();
  const timestamps = (recentMessages.get(userId) || []).filter(
    (t) => now - t < config.automod.spamWindowMs
  );
  timestamps.push(now);
  recentMessages.set(userId, timestamps);
  return timestamps.length > config.automod.spamMessageCount;
}

module.exports = { containsBannedWord, tooManyMentions, isSpamming };
