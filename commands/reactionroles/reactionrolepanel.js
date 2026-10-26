const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("reactionrole-panel")
    .setDescription("Post a new reaction-role panel in this channel")
    .addStringOption((o) => o.setName("title").setDescription("Panel title").setRequired(true))
    .addStringOption((o) => o.setName("description").setDescription("Panel description").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
  async execute(interaction) {
    const title = interaction.options.getString("title");
    const description = interaction.options.getString("description");

    const embed = new EmbedBuilder().setColor(0x5865f2).setTitle(title).setDescription(description);
    const msg = await interaction.channel.send({ embeds: [embed] });

    await interaction.reply({
      content:
        `Panel posted. Now add roles to it with:\n` +
        `\`/reactionrole-add message_id:${msg.id} emoji:<emoji> role:<role>\``,
      ephemeral: true,
    });
  },
};
