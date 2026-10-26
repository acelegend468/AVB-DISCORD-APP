const { EmbedBuilder } = require("discord.js");

function baseEmbed(color = 0x5865f2) {
  return new EmbedBuilder().setColor(color).setTimestamp();
}

function successEmbed(description) {
  return baseEmbed(0x57f287).setDescription(`✅ ${description}`);
}

function errorEmbed(description) {
  return baseEmbed(0xed4245).setDescription(`❌ ${description}`);
}

module.exports = { baseEmbed, successEmbed, errorEmbed };
