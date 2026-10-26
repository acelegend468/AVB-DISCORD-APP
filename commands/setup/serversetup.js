const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
} = require("discord.js");
const { ROLES, STRUCTURE } = require("../../utils/serverBlueprint");
const { successEmbed, errorEmbed } = require("../../utils/embeds");

function overwritesFor(visibility, readonly, roles, everyoneId) {
  const overwrites = [];

  if (visibility === "public") {
    if (readonly) {
      overwrites.push({ id: everyoneId, deny: [PermissionFlagsBits.SendMessages] });
    }
    return overwrites;
  }

  // "member" or "staff": hide from @everyone by default
  overwrites.push({ id: everyoneId, deny: [PermissionFlagsBits.ViewChannel] });

  if (visibility === "member") {
    const memberPerms = [PermissionFlagsBits.ViewChannel];
    if (!readonly) memberPerms.push(PermissionFlagsBits.SendMessages);
    if (roles.Member) overwrites.push({ id: roles.Member.id, allow: memberPerms });
    if (roles.Moderator)
      overwrites.push({
        id: roles.Moderator.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
      });
  }

  if (visibility === "staff") {
    if (roles.Member) overwrites.push({ id: roles.Member.id, deny: [PermissionFlagsBits.ViewChannel] });
    if (roles.Moderator)
      overwrites.push({
        id: roles.Moderator.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
      });
  }

  return overwrites;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup-server")
    .setDescription("Auto-build the full community server: roles, categories, channels & permissions")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    await interaction.deferReply();
    const guild = interaction.guild;
    const everyoneId = guild.roles.everyone.id;
    const log = [];

    // --- 1. ROLES ---
    const roleMap = {};
    for (const roleDef of ROLES) {
      let role = guild.roles.cache.find((r) => r.name === roleDef.name);
      if (!role) {
        try {
          role = await guild.roles.create({
            name: roleDef.name,
            color: roleDef.color,
            hoist: !!roleDef.hoist,
            permissions: roleDef.permissions || [],
            reason: "Automated server setup",
          });
          log.push(`✅ Created role **${roleDef.name}**`);
        } catch (err) {
          log.push(`⚠️ Failed to create role **${roleDef.name}**: ${err.message}`);
          continue;
        }
      } else {
        log.push(`↪️ Role **${roleDef.name}** already exists, skipped`);
      }
      roleMap[roleDef.name] = role;
    }

    // --- 2. CATEGORIES + CHANNELS ---
    for (const section of STRUCTURE) {
      let category = guild.channels.cache.find(
        (c) => c.name === section.category && c.type === ChannelType.GuildCategory
      );
      if (!category) {
        try {
          category = await guild.channels.create({
            name: section.category,
            type: ChannelType.GuildCategory,
            permissionOverwrites: overwritesFor(section.visibility, false, roleMap, everyoneId),
            reason: "Automated server setup",
          });
          log.push(`✅ Created category **${section.category}**`);
        } catch (err) {
          log.push(`⚠️ Failed to create category **${section.category}**: ${err.message}`);
          continue;
        }
      } else {
        log.push(`↪️ Category **${section.category}** already exists, skipped`);
      }

      for (const ch of section.channels) {
        const exists = guild.channels.cache.find(
          (c) => c.name.toLowerCase() === ch.name.toLowerCase() && c.parentId === category.id
        );
        if (exists) {
          log.push(`↪️ Channel **${ch.name}** already exists, skipped`);
          continue;
        }
        try {
          await guild.channels.create({
            name: ch.type === "voice" ? ch.name : ch.name.toLowerCase().replace(/\s+/g, "-"),
            type: ch.type === "voice" ? ChannelType.GuildVoice : ChannelType.GuildText,
            parent: category.id,
            permissionOverwrites: overwritesFor(section.visibility, !!ch.readonly, roleMap, everyoneId),
            reason: "Automated server setup",
          });
          log.push(`✅ Created ${ch.type} channel **${ch.name}**`);
        } catch (err) {
          log.push(`⚠️ Failed to create channel **${ch.name}**: ${err.message}`);
        }
      }
    }

    // Discord chat messages cap at ~2000 chars - chunk the log if needed
    const chunks = [];
    let current = "";
    for (const line of log) {
      if ((current + line + "\n").length > 1900) {
        chunks.push(current);
        current = "";
      }
      current += line + "\n";
    }
    if (current) chunks.push(current);

    await interaction.editReply({
      embeds: [
        successEmbed(
          "Server build complete! Review the log below.\n\n" +
            "⚠️ Make sure the bot's own role is dragged **above** the roles it just created " +
            "(Server Settings → Roles), or it won't be able to assign them."
        ),
      ],
    });
    for (const chunk of chunks) {
      await interaction.followUp({ content: chunk });
    }
  },
};
