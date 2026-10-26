const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("poll")
    .setDescription("Start a quick yes/no poll")
    .addStringOption((o) => o.setName("question").setDescription("Poll question").setRequired(true)),
  async execute(interaction) {
    const question = interaction.options.getString("question");
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("📊 Poll")
      .setDescription(question)
      .setFooter({ text: `Started by ${interaction.user.username}` });

    const msg = await interaction.reply({ embeds: [embed], fetchReply: true });
    await msg.react("👍");
    await msg.react("👎");
  },
};
