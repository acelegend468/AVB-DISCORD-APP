const { getMapping } = require("../utils/reactionRoles");

module.exports = {
  name: "messageReactionAdd",
  async execute(reaction, user) {
    if (user.bot) return;
    try {
      if (reaction.partial) await reaction.fetch();
      if (reaction.message.partial) await reaction.message.fetch();
    } catch {
      return;
    }

    const mapping = getMapping(reaction.message.id);
    if (!mapping) return;

    const emojiKey = reaction.emoji.id ? `<:${reaction.emoji.name}:${reaction.emoji.id}>` : reaction.emoji.name;
    const roleId = mapping[emojiKey];
    if (!roleId) return;

    const guild = reaction.message.guild;
    const member = await guild.members.fetch(user.id).catch(() => null);
    const role = guild.roles.cache.get(roleId);
    if (member && role) await member.roles.add(role).catch(() => {});
  },
};
