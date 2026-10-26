const { SlashCommandBuilder } = require("discord.js");
const { successEmbed, errorEmbed } = require("../../utils/embeds");
const { refreshMusicPanel } = require("../../utils/musicPanel");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("pause")
    .setDescription("Pause or resume the current song")
    .addStringOption((o) => o.setName("action").setDescription("pause or resume").setRequired(true).addChoices(
      { name: "pause", value: "pause" },
      { name: "resume", value: "resume" }
    )),
  async execute(interaction) {
    const queue = interaction.client.distube.getQueue(interaction.guildId);
    if (!queue) return interaction.reply({ embeds: [errorEmbed("Nothing is playing.")], ephemeral: true });
    if (interaction.options.getString("action") === "pause") {
      await queue.pause();
      refreshMusicPanel(interaction.client, interaction.guildId);
      return interaction.reply({ embeds: [successEmbed("Paused.")] });
    }
    await queue.resume();
    refreshMusicPanel(interaction.client, interaction.guildId);
    return interaction.reply({ embeds: [successEmbed("Resumed.")] });
  },
};
