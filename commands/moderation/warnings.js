const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { load } = require("../../utils/db");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("warnings")
    .setDescription("View a member's warning history")
    .addUserOption((o) => o.setName("target").setDescription("Member to check").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  async execute(interaction) {
    const target = interaction.options.getUser("target");
    const data = load("warnings");
    const warnings = data?.[interaction.guild.id]?.[target.id] || [];

    if (warnings.length === 0) {
      return interaction.reply({ content: `${target.tag} has no warnings.`, ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor(0xfee75c)
      .setTitle(`Warnings for ${target.tag}`)
      .setDescription(
        warnings
          .map((w, i) => `**${i + 1}.** ${w.reason}\n— by ${w.moderator} on ${new Date(w.date).toLocaleDateString()}`)
          .join("\n\n")
      );

    return interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
