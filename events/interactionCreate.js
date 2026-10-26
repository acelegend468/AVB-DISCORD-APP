const {
  ChannelType,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");
const config = require("../config");
const { errorEmbed, successEmbed } = require("../utils/embeds");
const { handleMusicPanelButton } = require("../utils/musicPanel");

module.exports = {
  name: "interactionCreate",
  async execute(interaction) {
    // ---- SLASH COMMANDS ----
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command) return;
      const receivedAgeMs = Date.now() - interaction.createdTimestamp;
      console.info(`[Interaction] /${interaction.commandName} received ${receivedAgeMs}ms after creation`);
      try {
        await command.execute(interaction);
      } catch (err) {
        const code = err?.code ?? err?.rawError?.code;
        // Discord REST errors can include an interaction URL containing its short-lived token.
        // Log only safe metadata, especially for expired acknowledgements (10062).
        console.error(`[Interaction] /${interaction.commandName} failed; code=${code ?? "unknown"}, name=${err?.name ?? "Error"}`);
        if (code === 10062) return;
        const payload = { embeds: [errorEmbed("Something went wrong running that command.")], ephemeral: true };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(payload).catch(() => {});
        } else {
          await interaction.reply(payload).catch(() => {});
        }
      }
      return;
    }

    // ---- BUTTONS ----
    if (interaction.isButton()) {
      if (interaction.customId.startsWith("musicpanel:")) {
        return handleMusicPanelButton(interaction);
      }

      // Verification button
      if (interaction.customId === "verify_button") {
        const unverifiedRole = interaction.guild.roles.cache.find((r) => r.name === config.roles.unverified);
        const memberRole = interaction.guild.roles.cache.find((r) => r.name === config.roles.member);

        if (memberRole) await interaction.member.roles.add(memberRole).catch(() => {});
        if (unverifiedRole) await interaction.member.roles.remove(unverifiedRole).catch(() => {});

        return interaction.reply({
          embeds: [successEmbed("You're verified! Welcome to the community 🎉")],
          ephemeral: true,
        });
      }

      // Ticket creation button
      if (interaction.customId === "create_ticket") {
        const existing = interaction.guild.channels.cache.find(
          (c) => c.name === `ticket-${interaction.user.username.toLowerCase()}`
        );
        if (existing) {
          return interaction.reply({
            embeds: [errorEmbed(`You already have an open ticket: ${existing}`)],
            ephemeral: true,
          });
        }

        const category = interaction.guild.channels.cache.find(
          (c) => c.name === config.channels.ticketCategory && c.type === ChannelType.GuildCategory
        );
        const modRole = interaction.guild.roles.cache.find((r) => r.name === config.roles.mod);

        const ticketChannel = await interaction.guild.channels.create({
          name: `ticket-${interaction.user.username}`,
          type: ChannelType.GuildText,
          parent: category ? category.id : undefined,
          permissionOverwrites: [
            { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
            ...(modRole
              ? [{ id: modRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }]
              : []),
          ],
        });

        const closeRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("close_ticket").setLabel("Close Ticket").setStyle(ButtonStyle.Danger)
        );

        const embed = new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle("🎫 Support Ticket")
          .setDescription(`Hey ${interaction.user}, describe your issue and staff will be with you shortly.`)
          .setTimestamp();

        await ticketChannel.send({ content: `${interaction.user}`, embeds: [embed], components: [closeRow] });

        return interaction.reply({
          embeds: [successEmbed(`Ticket created: ${ticketChannel}`)],
          ephemeral: true,
        });
      }

      // Ticket close button
      if (interaction.customId === "close_ticket") {
        await interaction.reply({ embeds: [successEmbed("Closing this ticket in 5 seconds...")] });
        setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
        return;
      }
    }
  },
};
