const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { addMapping } = require("../../utils/reactionRoles");
const { successEmbed, errorEmbed } = require("../../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("reactionrole-add")
    .setDescription("Link an emoji on a panel message to a role")
    .addStringOption((o) => o.setName("message_id").setDescription("The panel message ID").setRequired(true))
    .addStringOption((o) => o.setName("emoji").setDescription("The emoji members will react with").setRequired(true))
    .addRoleOption((o) => o.setName("role").setDescription("Role to grant").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
  async execute(interaction) {
    const messageId = interaction.options.getString("message_id");
    const emoji = interaction.options.getString("emoji");
    const role = interaction.options.getRole("role");

    const message = await interaction.channel.messages.fetch(messageId).catch(() => null);
    if (!message) {
      return interaction.reply({ embeds: [errorEmbed("Couldn't find that message in this channel.")], ephemeral: true });
    }

    if (role.position >= interaction.guild.members.me.roles.highest.position) {
      return interaction.reply({
        embeds: [errorEmbed("That role is positioned above (or equal to) my own role - I can't assign it. Move my role higher.")],
        ephemeral: true,
      });
    }

    try {
      await message.react(emoji);
    } catch {
      return interaction.reply({ embeds: [errorEmbed("I couldn't react with that emoji - make sure it's typed correctly (custom emojis must be from a server I'm in).")], ephemeral: true });
    }

    addMapping(messageId, emoji, role.id);
    return interaction.reply({
      embeds: [successEmbed(`Linked ${emoji} → **${role.name}** on that panel.`)],
      ephemeral: true,
    });
  },
};
