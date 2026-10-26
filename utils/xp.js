const { load, save } = require("./db");
const config = require("../config");

function xpForLevel(level) {
  return 5 * (level ** 2) + 50 * level + 100;
}

function getUser(guildId, userId) {
  const data = load("levels");
  data[guildId] = data[guildId] || {};
  data[guildId][userId] = data[guildId][userId] || { xp: 0, level: 0, lastMessage: 0 };
  save("levels", data);
  return data[guildId][userId];
}

function addXp(guildId, userId, amount) {
  const data = load("levels");
  data[guildId] = data[guildId] || {};
  const user = data[guildId][userId] || { xp: 0, level: 0, lastMessage: 0 };

  user.xp += amount;
  let leveledUp = false;
  while (user.xp >= xpForLevel(user.level + 1)) {
    user.level += 1;
    leveledUp = true;
  }
  data[guildId][userId] = user;
  save("levels", data);
  return { user, leveledUp };
}

function setCooldown(guildId, userId) {
  const data = load("levels");
  data[guildId] = data[guildId] || {};
  data[guildId][userId] = data[guildId][userId] || { xp: 0, level: 0, lastMessage: 0 };
  data[guildId][userId].lastMessage = Date.now();
  save("levels", data);
}

function onCooldown(guildId, userId) {
  const user = getUser(guildId, userId);
  return Date.now() - user.lastMessage < config.xp.cooldownSeconds * 1000;
}

function getLeaderboard(guildId, limit = 10) {
  const data = load("levels");
  const guildData = data[guildId] || {};
  return Object.entries(guildData)
    .sort((a, b) => b[1].xp - a[1].xp)
    .slice(0, limit);
}

module.exports = { xpForLevel, getUser, addXp, setCooldown, onCooldown, getLeaderboard };
