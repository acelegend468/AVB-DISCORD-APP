const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

const LANGUAGES = [
  ["Arabic", "ar"],
  ["Chinese (Simplified)", "zh-CN"],
  ["Dutch", "nl"],
  ["English", "en"],
  ["French", "fr"],
  ["German", "de"],
  ["Hindi", "hi"],
  ["Indonesian", "id"],
  ["Italian", "it"],
  ["Japanese", "ja"],
  ["Korean", "ko"],
  ["Portuguese", "pt"],
  ["Russian", "ru"],
  ["Spanish", "es"],
  ["Swahili", "sw"],
  ["Turkish", "tr"],
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("translate")
    .setDescription("Translate text into another language")
    .addStringOption((option) =>
      option
        .setName("text")
        .setDescription("Text to translate (up to 500 bytes)")
        .setRequired(true)
        .setMaxLength(500)
    )
    .addStringOption((option) =>
      option
        .setName("language")
        .setDescription("Language to translate into")
        .setRequired(true)
        .addChoices(...LANGUAGES.map(([name, code]) => ({ name, value: code })))
    ),

  async execute(interaction) {
    const text = interaction.options.getString("text", true).trim();
    const targetLanguage = interaction.options.getString("language", true);

    if (!text) {
      return interaction.reply({ content: "Enter some text to translate.", ephemeral: true });
    }
    if (Buffer.byteLength(text, "utf8") > 500) {
      return interaction.reply({
        content: "The translation service accepts up to 500 UTF-8 bytes. Please shorten the text.",
        ephemeral: true,
      });
    }

    await interaction.deferReply();

    const url = new URL("https://api.mymemory.translated.net/get");
    url.searchParams.set("q", text);
    url.searchParams.set("langpair", `autodetect|${targetLanguage}`);

    let response;
    try {
      response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    } catch {
      return interaction.editReply("The translation service is temporarily unavailable. Please try again shortly.");
    }

    if (!response.ok) {
      return interaction.editReply("The translation service could not complete that request. Please try again later.");
    }

    let result;
    try {
      result = await response.json();
    } catch {
      return interaction.editReply("The translation service returned an invalid response. Please try again later.");
    }

    const translatedText = result?.responseData?.translatedText;
    if (result?.responseStatus !== 200 || typeof translatedText !== "string" || !translatedText.trim()) {
      return interaction.editReply("I couldn't translate that text. Check the text and try again.");
    }

    const languageName = LANGUAGES.find(([, code]) => code === targetLanguage)?.[0] ?? targetLanguage;
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`Translation to ${languageName}`)
      .addFields(
        { name: "Original", value: text },
        { name: "Translated", value: translatedText.slice(0, 1024) }
      )
      .setFooter({ text: "Translations provided by MyMemory" });

    return interaction.editReply({ embeds: [embed] });
  },
};
