const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const config = require("../config");

module.exports = {
  name: "guildMemberAdd",
  async execute(member) {
    // Give the Unverified role so they can only see #welcome/#rules/#verify
    const unverifiedRole = member.guild.roles.cache.find((r) => r.name === config.roles.unverified);
    if (unverifiedRole) {
      await member.roles.add(unverifiedRole).catch(() => {});
    }

    const welcomeChannel = member.guild.channels.cache.find(
      (c) => c.name === config.channels.welcome
    );
    if (!welcomeChannel) return;

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`Welcome to ${member.guild.name}! 👋`)
      .setDescription(
        `Hey ${member}, glad you're here!\n\n` +
          `📜 Check out the rules\n` +
          `✅ Head to the verification channel and click **Verify** to unlock the server\n` +
          `🎮 Then jump into gaming, tech, or general chat!`
      )
      .setThumbnail(member.user.displayAvatarURL())
      .setFooter({ text: `Member #${member.guild.memberCount}` })
      .setTimestamp();

    welcomeChannel.send({ content: `${member}`, embeds: [embed] }).catch(() => {});
  },
};
