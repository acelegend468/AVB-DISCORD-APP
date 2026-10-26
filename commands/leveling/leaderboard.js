const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getLeaderboard } = require("../../utils/xp");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("View the server's top members by XP"),
  async execute(interaction) {
    const top = getLeaderboard(interaction.guild.id, 10);
    if (top.length === 0) {
      return interaction.reply("No one has earned XP yet - get chatting!");
    }

    const lines = await Promise.all(
      top.map(async ([userId, data], i) => {
        const member = await interaction.guild.members.fetch(userId).catch(() => null);
        const name = member ? member.user.username : `Unknown (${userId})`;
        return `**${i + 1}.** ${name} — Level ${data.level} (${data.xp} XP)`;
      })
    );

    const embed = new EmbedBuilder()
      .setColor(0xfee75c)
      .setTitle(`🏆 ${interaction.guild.name} Leaderboard`)
      .setDescription(lines.join("\n"));

    return interaction.reply({ embeds: [embed] });
  },
};
