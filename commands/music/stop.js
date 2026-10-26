const { SlashCommandBuilder } = require("discord.js");
const { successEmbed, errorEmbed } = require("../../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder().setName("stop").setDescription("Stop playback and clear the queue"),
  async execute(interaction) {
    await interaction.deferReply();
    const queue = interaction.client.distube.getQueue(interaction.guildId);
    if (!queue) {
      return interaction.editReply({ embeds: [errorEmbed("There isn't an active music queue. I'm staying in the voice channel.")] });
    }
    await queue.stop();
    return interaction.editReply({ embeds: [successEmbed("Playback stopped and the queue was cleared. I'm staying in the voice channel.")] });
  },
};
