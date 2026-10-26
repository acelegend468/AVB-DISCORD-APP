const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { load, save } = require("../../utils/db");
const { successEmbed } = require("../../utils/embeds");
const { logAction } = require("../../utils/modlog");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Warn a member")
    .addUserOption((o) => o.setName("target").setDescription("Member to warn").setRequired(true))
    .addStringOption((o) => o.setName("reason").setDescription("Reason for the warning").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  async execute(interaction) {
    const target = interaction.options.getUser("target");
    const reason = interaction.options.getString("reason");

    const data = load("warnings");
    data[interaction.guild.id] = data[interaction.guild.id] || {};
    data[interaction.guild.id][target.id] = data[interaction.guild.id][target.id] || [];
    data[interaction.guild.id][target.id].push({
      reason,
      moderator: interaction.user.tag,
      date: new Date().toISOString(),
    });
    save("warnings", data);

    await logAction(interaction.guild, `⚠️ **${target.tag}** was warned by ${interaction.user.tag}\nReason: ${reason}`);
    return interaction.reply({ embeds: [successEmbed(`${target.tag} has been warned. Reason: ${reason}`)] });
  },
};
