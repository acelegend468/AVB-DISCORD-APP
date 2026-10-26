const config = require("../config");
const { addXp, onCooldown, setCooldown } = require("../utils/xp");
const { containsBannedWord, tooManyMentions, isSpamming } = require("../utils/automod");
const { errorEmbed } = require("../utils/embeds");

module.exports = {
  name: "messageCreate",
  async execute(message) {
    if (message.author.bot || !message.guild) return;

    // --- AUTOMOD ---
    const isMod = message.member.permissions.has("ModerateMembers");
    if (!isMod) {
      if (containsBannedWord(message.content)) {
        await message.delete().catch(() => {});
        return message.channel
          .send({ embeds: [errorEmbed(`${message.author}, that word isn't allowed here.`)] })
          .then((m) => setTimeout(() => m.delete().catch(() => {}), 5000));
      }
      if (tooManyMentions(message)) {
        await message.delete().catch(() => {});
        return message.channel
          .send({ embeds: [errorEmbed(`${message.author}, please don't mass-mention.`)] })
          .then((m) => setTimeout(() => m.delete().catch(() => {}), 5000));
      }
      if (isSpamming(message.author.id)) {
        await message.delete().catch(() => {});
        return message.channel
          .send({ embeds: [errorEmbed(`${message.author}, slow down - that's spam.`)] })
          .then((m) => setTimeout(() => m.delete().catch(() => {}), 5000));
      }
    }

    // --- XP / LEVELING ---
    if (onCooldown(message.guild.id, message.author.id)) return;
    setCooldown(message.guild.id, message.author.id);

    const amount =
      Math.floor(Math.random() * (config.xp.maxPerMessage - config.xp.minPerMessage + 1)) +
      config.xp.minPerMessage;
    const { user, leveledUp } = addXp(message.guild.id, message.author.id, amount);

    if (leveledUp) {
      const levelUpChannel =
        message.guild.channels.cache.find((c) => c.name === config.channels.levelUp) ||
        message.channel;
      levelUpChannel
        .send(`🎉 ${message.author} just reached **Level ${user.level}**!`)
        .catch(() => {});

      // Auto level-role assignment
      const roleForLevel = [...config.roles.levelRoles]
        .reverse()
        .find((lr) => user.level >= lr.level);
      if (roleForLevel) {
        const role = message.guild.roles.cache.find((r) => r.name === roleForLevel.name);
        if (role) await message.member.roles.add(role).catch(() => {});
      }
    }
  },
};
