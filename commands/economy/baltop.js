const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getTop } = require("../../utils/economy");
const config = require("../../config");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("baltop")
    .setDescription(`View the richest members (${config.economy.currencyName} leaderboard)`),
  async execute(interaction) {
    const top = getTop(interaction.guild.id, 10);
    if (top.length === 0) {
      return interaction.reply("No one has any coins yet - try `/daily` or `/work`!");
    }

    const lines = await Promise.all(
      top.map(async ([userId, acct], i) => {
        const member = await interaction.guild.members.fetch(userId).catch(() => null);
        const name = member ? member.user.username : `Unknown (${userId})`;
        return `**${i + 1}.** ${name} — ${config.economy.currencyIcon} ${acct.balance.toLocaleString()}`;
      })
    );

    const embed = new EmbedBuilder()
      .setColor(0xfee75c)
      .setTitle(`💰 ${interaction.guild.name} Richest Members`)
      .setDescription(lines.join("\n"));

    return interaction.reply({ embeds: [embed] });
  },
};
