const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { errorEmbed } = require("../../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder().setName("nowplaying").setDescription("Show the song currently playing"),
  async execute(interaction) {
    const queue = interaction.client.distube.getQueue(interaction.guildId);
    const song = queue?.songs[0];
    if (!song) return interaction.reply({ embeds: [errorEmbed("Nothing is playing.")], ephemeral: true });
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("🎶 Now Playing")
      .setDescription(`[${song.name}](${song.url})`)
      .addFields(
        { name: "Queue", value: `${queue.songs.length} track(s)`, inline: true },
        { name: "Volume", value: `${queue.volume}%`, inline: true },
        { name: "Paused", value: queue.paused ? "Yes" : "No", inline: true }
      );
    return interaction.reply({ embeds: [embed] });
  },
};
