const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getAccount } = require("../../utils/economy");
const config = require("../../config");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("balance")
    .setDescription("Check your (or someone else's) coin balance")
    .addUserOption((o) => o.setName("target").setDescription("Member to check")),
  async execute(interaction) {
    const target = interaction.options.getUser("target") || interaction.user;
    const acct = getAccount(interaction.guild.id, target.id);

    const embed = new EmbedBuilder()
      .setColor(0xfee75c)
      .setTitle(`${target.username}'s Wallet`)
      .setDescription(`${config.economy.currencyIcon} **${acct.balance.toLocaleString()}** ${config.economy.currencyName}`)
      .setThumbnail(target.displayAvatarURL());

    return interaction.reply({ embeds: [embed] });
  },
};
