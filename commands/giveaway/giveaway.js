const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { successEmbed, errorEmbed } = require("../../utils/embeds");

// Simple giveaway: reacting with 🎉 enters you; ending picks a random reactor.
module.exports = {
  data: new SlashCommandBuilder()
    .setName("giveaway")
    .setDescription("Start or end a giveaway")
    .addSubcommand((sub) =>
      sub
        .setName("start")
        .setDescription("Start a new giveaway")
        .addStringOption((o) => o.setName("prize").setDescription("What are you giving away?").setRequired(true))
        .addIntegerOption((o) => o.setName("minutes").setDescription("Duration in minutes").setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName("end")
        .setDescription("End a giveaway early and pick a winner")
        .addStringOption((o) => o.setName("message_id").setDescription("The giveaway message ID").setRequired(true))
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === "start") {
      const prize = interaction.options.getString("prize");
      const minutes = interaction.options.getInteger("minutes");
      const endsAt = Date.now() + minutes * 60 * 1000;

      const embed = new EmbedBuilder()
        .setColor(0xfee75c)
        .setTitle("🎉 GIVEAWAY 🎉")
        .setDescription(`**Prize:** ${prize}\nReact with 🎉 to enter!\nEnds: <t:${Math.floor(endsAt / 1000)}:R>`)
        .setFooter({ text: `Hosted by ${interaction.user.username}` });

      await interaction.reply({ embeds: [embed], fetchReply: true }).then(async () => {
        const msg = await interaction.fetchReply();
        await msg.react("🎉");

        setTimeout(async () => {
          const fresh = await msg.fetch().catch(() => null);
          if (!fresh) return;
          const reaction = fresh.reactions.cache.get("🎉");
          const users = reaction ? await reaction.users.fetch() : new Map();
          const entrants = users.filter((u) => !u.bot);
          if (entrants.size === 0) {
            return fresh.reply("No one entered the giveaway. 😢");
          }
          const winner = entrants.random();
          fresh.reply(`🎉 Congratulations ${winner}, you won **${prize}**!`);
        }, minutes * 60 * 1000);
      });
      return;
    }

    if (sub === "end") {
      const messageId = interaction.options.getString("message_id");
      const msg = await interaction.channel.messages.fetch(messageId).catch(() => null);
      if (!msg) return interaction.reply({ embeds: [errorEmbed("Couldn't find that message in this channel.")], ephemeral: true });

      const reaction = msg.reactions.cache.get("🎉");
      const users = reaction ? await reaction.users.fetch() : new Map();
      const entrants = users.filter((u) => !u.bot);
      if (entrants.size === 0) {
        return interaction.reply({ embeds: [errorEmbed("No entrants for that giveaway.")] });
      }
      const winner = entrants.random();
      await interaction.reply({ embeds: [successEmbed(`Winner: ${winner}! 🎉`)] });
    }
  },
};
