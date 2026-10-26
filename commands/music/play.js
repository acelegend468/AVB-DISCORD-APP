const { SlashCommandBuilder } = require("discord.js");
const { Playlist: DisTubePlaylist } = require("distube");
const { parseSpotifyUrl, getTrack, getAlbumTracks, getPlaylistTracks } = require("../../utils/spotify");
const { successEmbed, errorEmbed } = require("../../utils/embeds");
const config = require("../../config");

async function mapConcurrent(items, concurrency, callback) {
  const results = new Array(items.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await callback(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

function isSoundCloudUrl(value) {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname === "snd.sc" || hostname === "soundcloud.com" || hostname.endsWith(".soundcloud.com");
  } catch {
    return false;
  }
}

function isYouTubeUrl(value) {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "www.youtu.be"].includes(hostname);
  } catch {
    return false;
  }
}

function withTimeout(promise, timeoutMs, label) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs / 1000} seconds.`)), timeoutMs);
    }),
  ]).finally(() => clearTimeout(timer));
}

async function preparePlayableSong(input, distube, member) {
  return withTimeout((async () => {
    const song = await distube.handler.resolve(input, { member });
    if (song?.songs) throw new Error("Use a direct video or track link, not a playlist link.");
    await distube.handler.attachStreamInfo(song);
    return song;
  })(), 30_000, "Audio stream lookup");
}

async function searchMusic(query, youtube, soundcloud, distube, member) {
  try {
    const matches = await withTimeout(youtube.search(query, { type: "video", limit: 1 }), 12_000, "YouTube search");
    if (matches?.[0]) {
      // Resolve the search result through yt-dlp and fetch its stream before
      // reporting success; YouTube search metadata alone doesn't mean audio works.
      return await preparePlayableSong(matches[0].url, distube, member);
    }
  } catch (error) {
    console.warn(`[Music] YouTube result wasn't playable for "${query}": ${error.message}`);
  }

  const matches = await withTimeout(soundcloud.search(query, "track", 1), 12_000, "SoundCloud search");
  if (!matches?.[0]) return null;
  return preparePlayableSong(matches[0], distube, member);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("Search YouTube and SoundCloud, or play a Spotify link")
    .addStringOption((option) =>
      option.setName("query").setDescription("YouTube/SoundCloud URL, song search, or Spotify link").setRequired(true)
    ),
  async execute(interaction) {
    await interaction.deferReply();
    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) {
      return interaction.editReply({ embeds: [errorEmbed("Join a voice channel first.")] });
    }
    const permissions = voiceChannel.permissionsFor(interaction.guild.members.me);
    if (!permissions?.has("Connect") || !permissions.has("Speak")) {
      return interaction.editReply({ embeds: [errorEmbed("I need Connect and Speak permissions in that voice channel.")] });
    }

    const query = interaction.options.getString("query").trim();
    const distube = interaction.client.distube;
    const soundcloud = interaction.client.soundcloudPlugin;
    const youtube = interaction.client.youtubePlugin;
    const queue = distube.getQueue(interaction.guildId);
    if (queue && queue.voiceChannel?.id !== voiceChannel.id) {
      return interaction.editReply({ embeds: [errorEmbed("Join the voice channel where I'm already playing music.")] });
    }
    if ((queue?.songs.length || 0) >= config.music.maxQueueSize) {
      return interaction.editReply({ embeds: [errorEmbed("Queue is full - try again once it's shorter.")] });
    }

    const spotifyInfo = parseSpotifyUrl(query);
    if (spotifyInfo) {
      let tracks;
      try {
        if (spotifyInfo.type === "track") tracks = [await getTrack(spotifyInfo.id)];
        else if (spotifyInfo.type === "album") tracks = await getAlbumTracks(spotifyInfo.id);
        else tracks = await getPlaylistTracks(spotifyInfo.id);
      } catch (error) {
        const message = /Spotify (?:network request failed|request to )|fetch failed/i.test(error.message)
          ? `Couldn't complete Spotify's API request from the bot PC (${error.message}). Check its internet/DNS connection, then try again.`
          : `Spotify lookup failed: ${error.message}`;
        return interaction.editReply({ embeds: [errorEmbed(message)] });
      }
      if (!tracks.length) return interaction.editReply({ embeds: [errorEmbed("No tracks found at that Spotify link.")] });

      const availableSlots = config.music.maxQueueSize - (distube.getQueue(interaction.guildId)?.songs.length || 0);
      const tracksToResolve = tracks.slice(0, availableSlots);
      if (!tracksToResolve.length) {
        return interaction.editReply({ embeds: [errorEmbed("Queue is full - try again once it's shorter.")] });
      }
      await interaction.editReply({
        embeds: [successEmbed(`Finding ${tracksToResolve.length} Spotify track(s) on YouTube and SoundCloud…`)],
      });

      const matches = await mapConcurrent(tracksToResolve, 3, async (track) => {
        try {
          return await searchMusic(`${track.name} ${track.artist}`, youtube, soundcloud, distube, interaction.member);
        } catch (error) {
          console.warn(`[Music] Skipping unavailable YouTube/SoundCloud match ${track.name}: ${error.message}`);
          return null;
        }
      });
      const songs = matches.filter(Boolean);
      const skippedCount = tracksToResolve.length - songs.length;
      if (!songs.length) {
        return interaction.editReply({ embeds: [errorEmbed("Couldn't find playable YouTube or SoundCloud matches for those Spotify tracks.")] });
      }

      const playlist = new DisTubePlaylist({
        source: "YouTube / SoundCloud",
        name: `Spotify ${spotifyInfo.type} via YouTube / SoundCloud`,
        songs,
      }, { member: interaction.member });
      try {
        await distube.play(voiceChannel, playlist, {
          textChannel: interaction.channel,
          member: interaction.member,
        });
      } catch (error) {
        console.error("[Music] Spotify match playback failed:", error);
        return interaction.editReply({ embeds: [errorEmbed(`Couldn't start playback: ${error.message}`)] });
      }

      const summary = spotifyInfo.type === "track"
        ? `Queued **${tracks[0].name}** using YouTube or SoundCloud audio.`
        : `Queued ${songs.length} track(s) from that Spotify ${spotifyInfo.type} using YouTube or SoundCloud audio.`;
      const limitNotice = tracks.length > tracksToResolve.length ? " The queue limit was reached." : "";
      return interaction.editReply({ embeds: [successEmbed(`${summary}${skippedCount ? ` ${skippedCount} track(s) were skipped.` : ""}${limitNotice}`)] });
    }

    try {
      let song;
      if (isSoundCloudUrl(query)) {
        await interaction.editReply({ embeds: [successEmbed("Loading from SoundCloud…")] });
        song = await preparePlayableSong(query, distube, interaction.member);
        await distube.play(voiceChannel, song, {
          textChannel: interaction.channel,
          member: interaction.member,
        });
        const currentQueue = distube.getQueue(interaction.guildId);
        const title = currentQueue?.songs.at(-1)?.name || "SoundCloud track";
        return interaction.editReply({ embeds: [successEmbed(`Added **${title}** from SoundCloud.`)] });
      }

      if (isYouTubeUrl(query)) {
        await interaction.editReply({ embeds: [successEmbed("Loading from YouTube…")] });
        song = await preparePlayableSong(query, distube, interaction.member);
        await distube.play(voiceChannel, song, {
          textChannel: interaction.channel,
          member: interaction.member,
        });
        const currentQueue = distube.getQueue(interaction.guildId);
        const title = currentQueue?.songs.at(-1)?.name || "YouTube track";
        return interaction.editReply({ embeds: [successEmbed(`Added **${title}** from YouTube.`)] });
      }

      if (/^https?:\/\//i.test(query)) {
        return interaction.editReply({ embeds: [errorEmbed("Use a YouTube/SoundCloud track URL, a search term, or a Spotify link.")] });
      }

      await interaction.editReply({ embeds: [successEmbed(`Searching YouTube, then SoundCloud, for **${query}**…`)] });
      song = await searchMusic(query, youtube, soundcloud, distube, interaction.member);
      if (!song) return interaction.editReply({ embeds: [errorEmbed("No matching YouTube or SoundCloud track was found.")] });

      await distube.play(voiceChannel, song, {
        textChannel: interaction.channel,
        member: interaction.member,
      });
      return interaction.editReply({ embeds: [successEmbed(`Queued **${song.name}** from ${song.source}; checking the audio stream.`)] });
    } catch (error) {
      console.error("[Music] YouTube/SoundCloud play request failed:", error);
      return interaction.editReply({ embeds: [errorEmbed(`Couldn't start playback. YouTube may require a fresh sign-in for this track. ${error.message}`)] });
    }
  },
};
