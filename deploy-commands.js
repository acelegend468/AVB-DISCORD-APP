// Registers all slash commands with Discord. Run this once after adding/changing commands.
// Usage: node deploy-commands.js
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { REST, Routes } = require("discord.js");

const commands = [];
const commandFolders = fs.readdirSync(path.join(__dirname, "commands"));
for (const folder of commandFolders) {
  const folderPath = path.join(__dirname, "commands", folder);
  const commandFiles = fs.readdirSync(folderPath).filter((f) => f.endsWith(".js"));
  for (const file of commandFiles) {
    const command = require(path.join(folderPath, file));
    if (command?.data) commands.push(command.data.toJSON());
  }
}

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log(`Deploying ${commands.length} slash commands...`);
    // Guild-scoped deploy = instant updates, best for development.
    // Swap to Routes.applicationCommands(CLIENT_ID) for global (takes ~1hr to propagate).
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log("Slash commands deployed successfully.");
  } catch (error) {
    console.error(error);
  }
})();
