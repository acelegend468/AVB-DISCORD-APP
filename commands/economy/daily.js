const { SlashCommandBuilder } = require("discord.js");
const { addBalance, setCooldown, remainingCooldown, formatMs } = require("../../utils/economy");
const { successEmbed, errorEmbed } = require("../../utils/embeds");
const config = require("../../config");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("daily")
    .setDescription(`Claim your daily ${config.economy.currencyName}`),
  async execute(interaction) {
    const remaining = remainingCooldown(interaction.guild.id, interaction.user.id, "lastDaily", config.economy.dailyCooldownMs);
    if (remaining > 0) {
      return interaction.reply({
        embeds: [errorEmbed(`You already claimed your daily reward. Try again in ${formatMs(remaining)}.`)],
        ephemeral: true,
      });
    }

    setCooldown(interaction.guild.id, interaction.user.id, "lastDaily");
    const acct = addBalance(interaction.guild.id, interaction.user.id, config.economy.dailyAmount);

    return interaction.reply({
      embeds: [
        successEmbed(
          `You claimed your daily ${config.economy.currencyIcon} **${config.economy.dailyAmount}** ${config.economy.currencyName}!\n` +
            `New balance: **${acct.balance.toLocaleString()}**`
        ),
      ],
    });
  },
};
