const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { successEmbed, errorEmbed } = require("../../utils/embeds");
const { logAction } = require("../../utils/modlog");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("Timeout (mute) a member")
    .addUserOption((o) => o.setName("target").setDescription("Member to timeout").setRequired(true))
    .addIntegerOption((o) => o.setName("minutes").setDescription("Duration in minutes").setRequired(true))
    .addStringOption((o) => o.setName("reason").setDescription("Reason for the timeout"))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  async execute(interaction) {
    const target = interaction.options.getMember("target");
    const minutes = interaction.options.getInteger("minutes");
    const reason = interaction.options.getString("reason") || "No reason provided";

    if (!target) return interaction.reply({ embeds: [errorEmbed("That member isn't in this server.")], ephemeral: true });
    if (!target.moderatable) return interaction.reply({ embeds: [errorEmbed("I can't timeout that member (role hierarchy).")], ephemeral: true });

    await target.timeout(minutes * 60 * 1000, reason);
    await logAction(interaction.guild, `🔇 **${target.user.tag}** was timed out for ${minutes}m by ${interaction.user.tag}\nReason: ${reason}`);
    return interaction.reply({ embeds: [successEmbed(`${target.user.tag} was timed out for ${minutes} minute(s).`)] });
  },
};
