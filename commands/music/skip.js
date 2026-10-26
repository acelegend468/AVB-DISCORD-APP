const { SlashCommandBuilder } = require("discord.js");
const { successEmbed, errorEmbed } = require("../../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder().setName("skip").setDescription("Skip the current song"),
  async execute(interaction) {
    const queue = interaction.client.distube.getQueue(interaction.guildId);
    if (!queue) return interaction.reply({ embeds: [errorEmbed("Nothing is playing.")], ephemeral: true });
    if (queue.songs.length < 2) {
      await queue.stop();
      return interaction.reply({ embeds: [successEmbed("Skipped the song; the queue is now empty.")] });
    }
    await queue.skip();
    return interaction.reply({ embeds: [successEmbed("Skipped.")] });
  },
};
