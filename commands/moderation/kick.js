const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { successEmbed, errorEmbed } = require("../../utils/embeds");
const { logAction } = require("../../utils/modlog");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kick a member from the server")
    .addUserOption((o) => o.setName("target").setDescription("Member to kick").setRequired(true))
    .addStringOption((o) => o.setName("reason").setDescription("Reason for the kick"))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  async execute(interaction) {
    const target = interaction.options.getMember("target");
    const reason = interaction.options.getString("reason") || "No reason provided";

    if (!target) return interaction.reply({ embeds: [errorEmbed("That member isn't in this server.")], ephemeral: true });
    if (!target.kickable) return interaction.reply({ embeds: [errorEmbed("I can't kick that member (role hierarchy).")], ephemeral: true });

    await target.kick(reason);
    await logAction(interaction.guild, `👢 **${target.user.tag}** was kicked by ${interaction.user.tag}\nReason: ${reason}`);
    return interaction.reply({ embeds: [successEmbed(`${target.user.tag} was kicked. Reason: ${reason}`)] });
  },
};
