const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getUser, xpForLevel } = require("../../utils/xp");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("rank")
    .setDescription("Check your (or someone else's) level and XP")
    .addUserOption((o) => o.setName("target").setDescription("Member to check")),
  async execute(interaction) {
    const target = interaction.options.getUser("target") || interaction.user;
    const user = getUser(interaction.guild.id, target.id);
    const needed = xpForLevel(user.level + 1);

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`${target.username}'s Rank`)
      .setThumbnail(target.displayAvatarURL())
      .addFields(
        { name: "Level", value: `${user.level}`, inline: true },
        { name: "XP", value: `${user.xp} / ${needed}`, inline: true }
      );

    return interaction.reply({ embeds: [embed] });
  },
};
