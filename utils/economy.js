const { load, save } = require("./db");
const config = require("../config");

function getAccount(guildId, userId) {
  const data = load("economy");
  data[guildId] = data[guildId] || {};
  data[guildId][userId] = data[guildId][userId] || { balance: 0, lastDaily: 0, lastWork: 0 };
  save("economy", data);
  return data[guildId][userId];
}

function addBalance(guildId, userId, amount) {
  const data = load("economy");
  data[guildId] = data[guildId] || {};
  data[guildId][userId] = data[guildId][userId] || { balance: 0, lastDaily: 0, lastWork: 0 };
  data[guildId][userId].balance += amount;
  save("economy", data);
  return data[guildId][userId];
}

function removeBalance(guildId, userId, amount) {
  const data = load("economy");
  data[guildId] = data[guildId] || {};
  const acct = data[guildId][userId] || { balance: 0, lastDaily: 0, lastWork: 0 };
  if (acct.balance < amount) return null; // insufficient funds
  acct.balance -= amount;
  data[guildId][userId] = acct;
  save("economy", data);
  return acct;
}

function transfer(guildId, fromId, toId, amount) {
  const data = load("economy");
  data[guildId] = data[guildId] || {};
  const from = data[guildId][fromId] || { balance: 0, lastDaily: 0, lastWork: 0 };
  if (from.balance < amount) return false;
  const to = data[guildId][toId] || { balance: 0, lastDaily: 0, lastWork: 0 };
  from.balance -= amount;
  to.balance += amount;
  data[guildId][fromId] = from;
  data[guildId][toId] = to;
  save("economy", data);
  return true;
}

function setCooldown(guildId, userId, field) {
  const data = load("economy");
  data[guildId] = data[guildId] || {};
  data[guildId][userId] = data[guildId][userId] || { balance: 0, lastDaily: 0, lastWork: 0 };
  data[guildId][userId][field] = Date.now();
  save("economy", data);
}

function remainingCooldown(guildId, userId, field, cooldownMs) {
  const acct = getAccount(guildId, userId);
  const elapsed = Date.now() - (acct[field] || 0);
  return Math.max(0, cooldownMs - elapsed);
}

function getTop(guildId, limit = 10) {
  const data = load("economy");
  const guildData = data[guildId] || {};
  return Object.entries(guildData)
    .sort((a, b) => b[1].balance - a[1].balance)
    .slice(0, limit);
}

function formatMs(ms) {
  const totalSeconds = Math.ceil(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const parts = [];
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (s || parts.length === 0) parts.push(`${s}s`);
  return parts.join(" ");
}

module.exports = {
  getAccount,
  addBalance,
  removeBalance,
  transfer,
  setCooldown,
  remainingCooldown,
  getTop,
  formatMs,
};
