const config = require("../config");

async function logAction(guild, message) {
  const channel = guild.channels.cache.find((c) => c.name === config.channels.modLog);
  if (channel) channel.send(message).catch(() => {});
}

module.exports = { logAction };
