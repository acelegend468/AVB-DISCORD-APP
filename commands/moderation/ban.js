const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { successEmbed, errorEmbed } = require("../../utils/embeds");
const { logAction } = require("../../utils/modlog");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban a member from the server")
    .addUserOption((o) => o.setName("target").setDescription("User to ban").setRequired(true))
    .addStringOption((o) => o.setName("reason").setDescription("Reason for the ban"))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  async execute(interaction) {
    const target = interaction.options.getUser("target");
    const reason = interaction.options.getString("reason") || "No reason provided";
    const member = interaction.guild.members.cache.get(target.id);

    if (member && !member.bannable) return interaction.reply({ embeds: [errorEmbed("I can't ban that member (role hierarchy).")], ephemeral: true });

    await interaction.guild.members.ban(target.id, { reason });
    await logAction(interaction.guild, `🔨 **${target.tag}** was banned by ${interaction.user.tag}\nReason: ${reason}`);
    return interaction.reply({ embeds: [successEmbed(`${target.tag} was banned. Reason: ${reason}`)] });
  },
};
