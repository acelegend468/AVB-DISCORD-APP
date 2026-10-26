const { SlashCommandBuilder } = require("discord.js");
const { successEmbed, errorEmbed } = require("../../utils/embeds");
const { setChannel, clearChannel } = require("../../utils/music247");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("24-7")
    .setDescription("Keep the bot connected to your voice channel even when nothing is playing")
    .addBooleanOption((option) =>
      option.setName("enabled").setDescription("Turn 24/7 voice mode on or off").setRequired(true)
    ),
  async execute(interaction) {
    const enabled = interaction.options.getBoolean("enabled");
    const distube = interaction.client.distube;
    if (enabled) {
      const channel = interaction.member.voice.channel;
      if (!channel) {
        return interaction.reply({ embeds: [errorEmbed("Join the voice channel you want me to stay in first.")], ephemeral: true });
      }
      const permissions = channel.permissionsFor(interaction.guild.members.me);
      if (!permissions?.has("Connect") || !permissions.has("Speak")) {
        return interaction.reply({ embeds: [errorEmbed("I need Connect and Speak permissions in that voice channel.")], ephemeral: true });
      }

      setChannel(interaction.guildId, channel.id);
      try {
        await distube.voices.join(channel);
      } catch (error) {
        clearChannel(interaction.guildId);
        return interaction.reply({ embeds: [errorEmbed(`Couldn't stay in that voice channel: ${error.message}`)], ephemeral: true });
      }
      return interaction.reply({ embeds: [successEmbed(`24/7 mode is on. I'll stay connected to **${channel.name}**, including when the queue is empty.`)] });
    }

    clearChannel(interaction.guildId);
    const queue = distube.getQueue(interaction.guildId);
    if (queue) await queue.stop();
    distube.voices.leave(interaction.guildId);
    return interaction.reply({ embeds: [successEmbed("24/7 mode is off. I stopped playback and left the voice channel.")] });
  },
};
