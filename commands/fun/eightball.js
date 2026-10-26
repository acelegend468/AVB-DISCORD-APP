const { SlashCommandBuilder } = require("discord.js");

const responses = [
  "Yes, definitely.", "It is decided.", "Without a doubt.", "Ask again later.",
  "Cannot predict now.", "Don't count on it.", "My sources say no.", "Very doubtful.",
  "Signs point to yes.", "Outlook good.",
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("8ball")
    .setDescription("Ask the magic 8-ball a question")
    .addStringOption((o) => o.setName("question").setDescription("Your question").setRequired(true)),
  async execute(interaction) {
    const question = interaction.options.getString("question");
    const answer = responses[Math.floor(Math.random() * responses.length)];
    return interaction.reply(`🎱 **${question}**\n${answer}`);
  },
};
