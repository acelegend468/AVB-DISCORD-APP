const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { load, save } = require("../../utils/db");
const { panelPayload, rememberPanelMessage } = require("../../utils/musicPanel");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("music-panel")
    .setDescription("Post a live music controller in this channel"),
  async execute(interaction) {
    if (!interaction.channel?.isTextBased()) {
      return interaction.reply({ content: "Run this command in a server text channel.", flags: MessageFlags.Ephemeral });
    }
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const panels = load("musicPanels");
    const previous = panels[interaction.guildId];
    if (previous) {
      try {
        const oldChannel = interaction.client.channels.cache.get(previous.channelId)
          || await interaction.client.channels.fetch(previous.channelId);
        const oldMessage = await oldChannel.messages.fetch(previous.messageId);
        await oldMessage.edit({ content: "This music panel was replaced.", components: [] });
      } catch {
        // The prior panel may have been deleted or its channel may no longer exist.
      }
    }

    const message = await interaction.channel.send(
      panelPayload(interaction.client.distube.getQueue(interaction.guildId))
    );
    panels[interaction.guildId] = {
      channelId: interaction.channelId,
      messageId: message.id,
    };
    save("musicPanels", panels);
    rememberPanelMessage(interaction.guildId, message);
    return interaction.editReply({ content: "Music controller posted. Members in the bot's voice channel can use its buttons." });
  },
};
