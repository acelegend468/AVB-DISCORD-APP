const { SlashCommandBuilder } = require("discord.js");
const { successEmbed, errorEmbed } = require("../../utils/embeds");
const { refreshMusicPanel } = require("../../utils/musicPanel");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("remove")
    .setDescription("Remove an upcoming song by its position in /queue")
    .addIntegerOption((o) => o.setName("position").setDescription("Upcoming track number").setRequired(true).setMinValue(1)),
  async execute(interaction) {
    const queue = interaction.client.distube.getQueue(interaction.guildId);
    const position = interaction.options.getInteger("position");
    if (!queue || position >= queue.songs.length) {
      return interaction.reply({ embeds: [errorEmbed("That upcoming queue position doesn't exist.")], ephemeral: true });
    }
    const [song] = queue.songs.splice(position, 1);
    refreshMusicPanel(interaction.client, interaction.guildId);
    return interaction.reply({ embeds: [successEmbed(`Removed **${song.name}** from the queue.`)] });
  },
};
