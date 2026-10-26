const { SlashCommandBuilder } = require("discord.js");
const { transfer } = require("../../utils/economy");
const { successEmbed, errorEmbed } = require("../../utils/embeds");
const config = require("../../config");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("pay")
    .setDescription(`Send ${config.economy.currencyName} to another member`)
    .addUserOption((o) => o.setName("target").setDescription("Who to pay").setRequired(true))
    .addIntegerOption((o) => o.setName("amount").setDescription("Amount to send").setRequired(true)),
  async execute(interaction) {
    const target = interaction.options.getUser("target");
    const amount = interaction.options.getInteger("amount");

    if (target.id === interaction.user.id) {
      return interaction.reply({ embeds: [errorEmbed("You can't pay yourself.")], ephemeral: true });
    }
    if (target.bot) {
      return interaction.reply({ embeds: [errorEmbed("You can't pay a bot.")], ephemeral: true });
    }
    if (amount <= 0) {
      return interaction.reply({ embeds: [errorEmbed("Amount must be positive.")], ephemeral: true });
    }

    const ok = transfer(interaction.guild.id, interaction.user.id, target.id, amount);
    if (!ok) {
      return interaction.reply({ embeds: [errorEmbed("You don't have enough funds for that.")], ephemeral: true });
    }

    return interaction.reply({
      embeds: [successEmbed(`Sent ${config.economy.currencyIcon} **${amount}** ${config.economy.currencyName} to ${target}.`)],
    });
  },
};
