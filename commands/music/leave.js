const { SlashCommandBuilder } = require("discord.js");
const { successEmbed, errorEmbed } = require("../../utils/embeds");
const { clearChannel } = require("../../utils/music247");

module.exports = {
  data: new SlashCommandBuilder().setName("leave").setDescription("Stop music, clear the queue, and disconnect from voice"),
  async execute(interaction) {
    const distube = interaction.client.distube;
    const queue = distube.getQueue(interaction.guildId);
    const voice = distube.voices.get(interaction.guildId);
    if (!queue && !voice) {
      clearChannel(interaction.guildId);
      return interaction.reply({ embeds: [errorEmbed("I'm not connected to a voice channel.")], ephemeral: true });
    }

    clearChannel(interaction.guildId);
    if (queue) await queue.stop();
    distube.voices.leave(interaction.guildId);
    return interaction.reply({ embeds: [successEmbed("Stopped playback, cleared the queue, and left the voice channel. 24/7 mode is off.")] });
  },
};
