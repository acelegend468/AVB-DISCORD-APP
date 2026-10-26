require("dotenv").config();
const ffmpeg = require("ffmpeg-static");
const fs = require("fs");
const path = require("path");
const { Client, GatewayIntentBits, Partials, Collection } = require("discord.js");
const { DisTube } = require("distube");
const { SoundCloudPlugin } = require("@distube/soundcloud");
const { YouTubePlugin } = require("@distube/youtube");
const { YtDlpExtractor } = require("./utils/ytDlpExtractor");
const { refreshMusicPanel } = require("./utils/musicPanel");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

client.soundcloudPlugin = new SoundCloudPlugin();
// Keep YouTube search, but use the maintained yt-dlp extractor for audio streams.
// The older @distube/youtube playback path depends on ytdl-core and fails with
// "Failed to find any playable formats" on current YouTube responses.
client.youtubePlugin = new YouTubePlugin();
client.ytDlpPlugin = new YtDlpExtractor();
client.distube = new DisTube(client, {
  plugins: [client.soundcloudPlugin, client.ytDlpPlugin],
  ffmpeg: { path: ffmpeg },
  emitNewSongOnly: true,
});
console.log("[Music] Backend loaded: YouTube search + yt-dlp playback, with SoundCloud fallback");

client.distube
  .on("playSong", (queue, song) => {
    console.log(`[Music] DisTube playing: ${song.name}`);
    queue.textChannel?.send(`🎶 **Now playing:** [${song.name}](${song.url})`).catch(() => {});
    refreshMusicPanel(client, queue.id);
  })
  .on("addSong", (queue, song) => {
    console.log(`[Music] Added to queue: ${song.name}`);
    refreshMusicPanel(client, queue.id);
  })
  .on("finishSong", (queue) => {
    refreshMusicPanel(client, queue.id);
  })
  .on("deleteQueue", (queue) => {
    refreshMusicPanel(client, queue.id);
  })
  .on("error", (error, queue, song) => {
    console.error(`[Music] DisTube error${song ? ` for ${song.name}` : ""}:`, error);
    queue?.textChannel?.send(`⚠️ Music playback error: ${error.message}`).catch(() => {});
  });

// Load slash commands from every subfolder in /commands
client.commands = new Collection();
const commandFolders = fs.readdirSync(path.join(__dirname, "commands"));
for (const folder of commandFolders) {
  const folderPath = path.join(__dirname, "commands", folder);
  const commandFiles = fs.readdirSync(folderPath).filter((f) => f.endsWith(".js"));
  for (const file of commandFiles) {
    const command = require(path.join(folderPath, file));
    if (command?.data?.name) {
      client.commands.set(command.data.name, command);
    }
  }
}

// Load event handlers from /events
const eventFiles = fs.readdirSync(path.join(__dirname, "events")).filter((f) => f.endsWith(".js"));
for (const file of eventFiles) {
  const event = require(path.join(__dirname, "events", file));
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
}

// Safety net: uncaught rejections keep the bot alive
process.on("unhandledRejection", (err) => {
  console.error("Unhandled promise rejection (bot is still running):", err);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception (bot is still running):", err);
});

client.login(process.env.DISCORD_TOKEN);
