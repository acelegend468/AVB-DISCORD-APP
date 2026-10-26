const { SlashCommandBuilder } = require("discord.js");
const { errorEmbed, successEmbed } = require("../../utils/embeds");
const { refreshMusicPanel } = require("../../utils/musicPanel");

module.exports = {
  data: new SlashCommandBuilder().setName("shuffle").setDescription("Shuffle upcoming songs in the queue"),
  async execute(interaction) {
    const queue = interaction.client.distube.getQueue(interaction.guildId);
    if (!queue || queue.songs.length < 3) {
      return interaction.reply({ embeds: [errorEmbed("Add at least two upcoming tracks before shuffling.")], ephemeral: true });
    }
    await queue.shuffle();
    refreshMusicPanel(interaction.client, interaction.guildId);
    return interaction.reply({ embeds: [successEmbed("Shuffled the upcoming queue.")] });
  },
};
