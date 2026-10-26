const { SlashCommandBuilder } = require("discord.js");
const { successEmbed } = require("../../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("close")
    .setDescription("Close the current ticket channel"),
  async execute(interaction) {
    if (!interaction.channel.name.startsWith("ticket-")) {
      return interaction.reply({ content: "This command only works inside a ticket channel.", ephemeral: true });
    }
    await interaction.reply({ embeds: [successEmbed("Closing this ticket in 5 seconds...")] });
    setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
  },
};
