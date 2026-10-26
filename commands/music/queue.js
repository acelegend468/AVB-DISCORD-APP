const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { errorEmbed } = require("../../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder().setName("queue").setDescription("Show the current song queue"),
  async execute(interaction) {
    const queue = interaction.client.distube.getQueue(interaction.guildId);
    if (!queue?.songs.length) return interaction.reply({ embeds: [errorEmbed("The queue is empty.")] });
    const lines = queue.songs.slice(0, 10).map((song, index) =>
      index === 0 ? `▶️ **${song.name}** (now playing)` : `**${index}.** ${song.name}`
    );
    if (queue.songs.length > 10) lines.push(`…and ${queue.songs.length - 10} more`);
    const loop = ["off", "song", "queue"][queue.repeatMode] || "off";
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("🎵 Music Queue")
      .setDescription(lines.join("\n"))
      .addFields(
        { name: "Tracks", value: String(queue.songs.length), inline: true },
        { name: "Loop", value: loop, inline: true },
        { name: "Volume", value: `${queue.volume}%`, inline: true }
      );
    return interaction.reply({ embeds: [embed] });
  },
};
