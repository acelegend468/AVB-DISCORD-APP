const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { successEmbed } = require("../../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("clear")
    .setDescription("Bulk delete recent messages in this channel")
    .addIntegerOption((o) =>
      o.setName("amount").setDescription("How many messages (1-100)").setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  async execute(interaction) {
    const amount = interaction.options.getInteger("amount");
    if (amount < 1 || amount > 100) {
      return interaction.reply({ content: "Pick a number between 1 and 100.", ephemeral: true });
    }
    const deleted = await interaction.channel.bulkDelete(amount, true);
    return interaction.reply({ embeds: [successEmbed(`Deleted ${deleted.size} messages.`)], ephemeral: true });
  },
};
