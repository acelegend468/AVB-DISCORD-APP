const { SlashCommandBuilder } = require("discord.js");
const { successEmbed, errorEmbed } = require("../../utils/embeds");
const { refreshMusicPanel } = require("../../utils/musicPanel");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("volume")
    .setDescription("Set music playback volume")
    .addIntegerOption((o) => o.setName("level").setDescription("Volume from 0 to 100").setRequired(true).setMinValue(0).setMaxValue(100)),
  async execute(interaction) {
    const queue = interaction.client.distube.getQueue(interaction.guildId);
    if (!queue) return interaction.reply({ embeds: [errorEmbed("Nothing is playing.")], ephemeral: true });
    const level = interaction.options.getInteger("level");
    queue.setVolume(level);
    refreshMusicPanel(interaction.client, interaction.guildId);
    return interaction.reply({ embeds: [successEmbed(`Volume set to **${level}%**.`)] });
  },
};
