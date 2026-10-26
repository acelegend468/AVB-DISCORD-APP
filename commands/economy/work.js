const { SlashCommandBuilder } = require("discord.js");
const { addBalance, setCooldown, remainingCooldown, formatMs } = require("../../utils/economy");
const { successEmbed, errorEmbed } = require("../../utils/embeds");
const config = require("../../config");

const flavor = [
  "You debugged a client's PC and got paid.",
  "You coached a squad to a win and they tipped you.",
  "You flipped some spare PC parts online.",
  "You streamed for a bit and got a few donations.",
  "You helped someone optimize their FPS for a fee.",
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("work")
    .setDescription(`Work a shift to earn ${config.economy.currencyName}`),
  async execute(interaction) {
    const remaining = remainingCooldown(interaction.guild.id, interaction.user.id, "lastWork", config.economy.workCooldownMs);
    if (remaining > 0) {
      return interaction.reply({
        embeds: [errorEmbed(`You're still on cooldown. Try again in ${formatMs(remaining)}.`)],
        ephemeral: true,
      });
    }

    const amount =
      Math.floor(Math.random() * (config.economy.workMax - config.economy.workMin + 1)) + config.economy.workMin;
    setCooldown(interaction.guild.id, interaction.user.id, "lastWork");
    const acct = addBalance(interaction.guild.id, interaction.user.id, amount);
    const line = flavor[Math.floor(Math.random() * flavor.length)];

    return interaction.reply({
      embeds: [
        successEmbed(
          `${line}\nYou earned ${config.economy.currencyIcon} **${amount}** ${config.economy.currencyName}.\n` +
            `New balance: **${acct.balance.toLocaleString()}**`
        ),
      ],
    });
  },
};
