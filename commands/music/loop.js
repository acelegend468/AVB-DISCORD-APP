const { SlashCommandBuilder } = require("discord.js");
const { RepeatMode } = require("distube");
const { successEmbed, errorEmbed } = require("../../utils/embeds");
const { refreshMusicPanel } = require("../../utils/musicPanel");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("loop")
    .setDescription("Set the music repeat mode")
    .addStringOption((o) => o.setName("mode").setDescription("What to repeat").setRequired(true).addChoices(
      { name: "Off", value: "off" },
      { name: "Current song", value: "song" },
      { name: "Entire queue", value: "queue" }
    )),
  async execute(interaction) {
    const queue = interaction.client.distube.getQueue(interaction.guildId);
    if (!queue) return interaction.reply({ embeds: [errorEmbed("Nothing is playing.")], ephemeral: true });
    const mode = interaction.options.getString("mode");
    const value = { off: RepeatMode.DISABLED, song: RepeatMode.SONG, queue: RepeatMode.QUEUE }[mode];
    queue.setRepeatMode(value);
    refreshMusicPanel(interaction.client, interaction.guildId);
    return interaction.reply({ embeds: [successEmbed(`Looping ${mode === "song" ? "the current song" : mode === "queue" ? "the queue" : "off"}.`)] });
  },
};
