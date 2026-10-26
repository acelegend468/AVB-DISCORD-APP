const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("Show info about a member")
    .addUserOption((o) => o.setName("target").setDescription("Member to inspect")),
  async execute(interaction) {
    const user = interaction.options.getUser("target") || interaction.user;
    const member = interaction.guild.members.cache.get(user.id);

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(user.username)
      .setThumbnail(user.displayAvatarURL())
      .addFields(
        { name: "Joined Server", value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
        { name: "Account Created", value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
        { name: "Roles", value: member.roles.cache.filter((r) => r.name !== "@everyone").map((r) => r.name).join(", ") || "None" }
      );

    return interaction.reply({ embeds: [embed] });
  },
};
