const { load, save } = require("./db");

const rejoinTimers = new Map();

function getSettings() {
  return load("music247");
}

function setChannel(guildId, channelId) {
  const settings = getSettings();
  settings[guildId] = { channelId };
  save("music247", settings);
}

function clearChannel(guildId) {
  const settings = getSettings();
  delete settings[guildId];
  save("music247", settings);
  const timer = rejoinTimers.get(guildId);
  if (timer) clearTimeout(timer);
  rejoinTimers.delete(guildId);
}

async function connectConfiguredGuild(client, guildId, expectedChannelId) {
  const settings = getSettings();
  const configured = settings[guildId]?.channelId;
  if (!configured || (expectedChannelId && configured !== expectedChannelId)) return;

  const guild = client.guilds.cache.get(guildId);
  if (!guild) return;
  const channel = guild.channels.cache.get(configured) || await guild.channels.fetch(configured).catch(() => null);
  if (!channel?.isVoiceBased() || !channel.joinable) {
    console.warn(`[Music] Can't restore 24/7 voice in guild ${guildId}: configured voice channel is unavailable or not joinable.`);
    return;
  }
  if (getSettings()[guildId]?.channelId !== configured) return;
  await client.distube.voices.join(channel);
  console.log(`[Music] Restored 24/7 voice in ${guild.name} / ${channel.name}`);
}

async function restoreConnections(client) {
  for (const [guildId, setting] of Object.entries(getSettings())) {
    try {
      await connectConfiguredGuild(client, guildId, setting.channelId);
    } catch (error) {
      console.error(`[Music] Couldn't restore 24/7 voice for ${guildId}:`, error.message);
    }
  }
}

function handleVoiceStateUpdate(oldState, newState, client) {
  if (newState.id !== client.user.id) return;
  const guildId = newState.guild.id;
  const setting = getSettings()[guildId];
  if (!setting?.channelId || newState.channelId === setting.channelId) return;

  const pending = rejoinTimers.get(guildId);
  if (pending) clearTimeout(pending);
  const timer = setTimeout(() => {
    rejoinTimers.delete(guildId);
    connectConfiguredGuild(client, guildId, setting.channelId).catch((error) => {
      console.error(`[Music] Couldn't restore 24/7 voice for ${guildId}:`, error.message);
    });
  }, 2000);
  timer.unref?.();
  rejoinTimers.set(guildId, timer);
}

module.exports = { getSettings, setChannel, clearChannel, restoreConnections, handleVoiceStateUpdate };
