const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");
const { RepeatMode } = require("distube");
const { load, save } = require("./db");

const messageCache = new Map();
const refreshTimers = new Map();

function rememberPanelMessage(guildId, message) {
  messageCache.set(guildId, message);
}

function loopName(mode) {
  if (mode === RepeatMode.SONG) return "Current song";
  if (mode === RepeatMode.QUEUE) return "Queue";
  return "Off";
}

function panelPayload(queue) {
  const song = queue?.songs?.[0];
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("🎶 Music Controller")
    .setTimestamp();

  if (!song) {
    embed.setDescription("Nothing is playing right now. Use `/play` to add a song.");
  } else {
    embed
      .setDescription(`[${song.name}](${song.url})`)
      .addFields(
        { name: "Added by", value: song.member?.toString() || "Music request", inline: true },
        { name: "Duration", value: song.formattedDuration || "Live", inline: true },
        { name: "Position", value: `${queue.formattedCurrentTime || "0:00"} / ${song.formattedDuration || "Live"}`, inline: true },
        { name: "Queue", value: `${queue.songs.length} track(s)`, inline: true },
        { name: "Volume", value: `${queue.volume}%`, inline: true },
        { name: "Loop", value: loopName(queue.repeatMode), inline: true }
      );
    if (song.thumbnail) embed.setThumbnail(song.thumbnail);
  }

  const active = Boolean(song);
  const controls = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("musicpanel:toggle")
      .setLabel(queue?.paused ? "Resume" : "Pause")
      .setEmoji(queue?.paused ? "▶️" : "⏸️")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(!active),
    new ButtonBuilder().setCustomId("musicpanel:skip").setLabel("Skip").setEmoji("⏭️").setStyle(ButtonStyle.Secondary).setDisabled(!active),
    new ButtonBuilder().setCustomId("musicpanel:stop").setLabel("Stop").setEmoji("⏹️").setStyle(ButtonStyle.Danger).setDisabled(!active),
    new ButtonBuilder().setCustomId("musicpanel:loop").setLabel(`Loop: ${loopName(queue?.repeatMode)}`).setStyle(ButtonStyle.Secondary).setDisabled(!active),
    new ButtonBuilder().setCustomId("musicpanel:queue").setLabel("Queue").setEmoji("📜").setStyle(ButtonStyle.Secondary).setDisabled(!active)
  );
  const volume = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("musicpanel:vol_down").setLabel("Volume −10").setStyle(ButtonStyle.Secondary).setDisabled(!active),
    new ButtonBuilder().setCustomId("musicpanel:vol_up").setLabel("Volume +10").setStyle(ButtonStyle.Secondary).setDisabled(!active)
  );

  return { embeds: [embed], components: [controls, volume] };
}

function queueEmbed(queue) {
  const lines = queue.songs.slice(0, 15).map((song, index) =>
    index === 0 ? `▶️ **${song.name}** (now playing)` : `**${index}.** ${song.name}`
  );
  if (queue.songs.length > 15) lines.push(`…and ${queue.songs.length - 15} more`);
  return new EmbedBuilder().setColor(0x5865f2).setTitle("🎵 Music Queue").setDescription(lines.join("\n"));
}

async function refreshMusicPanelNow(client, guildId) {
  const panels = load("musicPanels");
  const panel = panels[guildId];
  if (!panel) return;
  try {
    let message = messageCache.get(guildId);
    if (!message || message.id !== panel.messageId || message.channelId !== panel.channelId) {
      const channel = client.channels.cache.get(panel.channelId) || await client.channels.fetch(panel.channelId);
      message = await channel.messages.fetch(panel.messageId);
      messageCache.set(guildId, message);
    }
    await message.edit(panelPayload(client.distube.getQueue(guildId)));
  } catch (error) {
    if (error.code === 10008 || error.code === 10003) {
      messageCache.delete(guildId);
      delete panels[guildId];
      save("musicPanels", panels);
      return;
    }
    console.error(`[Music] Couldn't refresh controller panel for ${guildId}:`, error.message);
  }
}

function refreshMusicPanel(client, guildId) {
  const pending = refreshTimers.get(guildId);
  if (pending) clearTimeout(pending);
  const timer = setTimeout(() => {
    refreshTimers.delete(guildId);
    refreshMusicPanelNow(client, guildId).catch((error) => {
      console.error(`[Music] Couldn't refresh controller panel for ${guildId}:`, error.message);
    });
  }, 250);
  timer.unref?.();
  refreshTimers.set(guildId, timer);
}

async function handleMusicPanelButton(interaction) {
  rememberPanelMessage(interaction.guildId, interaction.message);
  const queue = interaction.client.distube.getQueue(interaction.guildId);
  if (!queue) {
    return interaction.reply({ content: "There isn't an active music queue.", ephemeral: true });
  }
  if (interaction.member.voice.channelId !== queue.voiceChannel?.id) {
    return interaction.reply({ content: "Join the bot's voice channel to use these controls.", ephemeral: true });
  }

  const action = interaction.customId.split(":")[1];
  if (action === "queue") {
    return interaction.reply({ embeds: [queueEmbed(queue)], ephemeral: true });
  }

  await interaction.deferUpdate();
  try {
    if (action === "toggle") {
      if (queue.paused) await queue.resume();
      else await queue.pause();
    } else if (action === "skip") {
      if (queue.songs.length > 1) await queue.skip();
      else await queue.stop();
    } else if (action === "stop") {
      await queue.stop();
    } else if (action === "loop") {
      const next = (queue.repeatMode + 1) % 3;
      queue.setRepeatMode(next);
    } else if (action === "vol_down" || action === "vol_up") {
      const adjustment = action === "vol_up" ? 10 : -10;
      queue.setVolume(Math.max(0, Math.min(100, queue.volume + adjustment)));
    }
    await interaction.message.edit(panelPayload(interaction.client.distube.getQueue(interaction.guildId)));
  } catch (error) {
    console.error(`[Music] Controller action ${action} failed:`, error);
    await interaction.followUp({ content: `That music control failed: ${error.message}`, ephemeral: true }).catch(() => {});
  }
}

module.exports = { panelPayload, refreshMusicPanel, rememberPanelMessage, handleMusicPanelButton };
