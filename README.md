# Community Bot

An all-in-one Discord.js bot for moderation, leveling, verification, tickets, and fun/giveaways.
Built for a gaming + tech/PC-optimization + general hangout community.

## Features
- **Automated server build:** `/setup-server` creates the *entire* blueprint for you — every role,
  category, channel, and permission overwrite — in one command. No manual channel-clicking required.
- **Moderation & Automod:** `/kick` `/ban` `/timeout` `/warn` `/warnings` `/clear`, plus automatic
  filtering of banned words, mass mentions, and spam (all actions logged to `#mod-log`).
- **Leveling/XP:** members earn XP from chatting (with cooldown), `/rank`, `/leaderboard`,
  automatic level-up announcements, and automatic level-role assignment.
- **Welcome & Verification:** new members get an `Unverified` role and a welcome embed;
  `/setup-verification` posts a button that upgrades them to `Member`.
- **Tickets:** `/setup-tickets` posts a button that opens a private ticket channel per user;
  `/close` (or the button) closes it.
- **Fun/Utility & Giveaways:** `/8ball` `/poll` `/userinfo` `/serverinfo` `/giveaway start` `/giveaway end`.
- **Economy:** `/balance` `/daily` `/work` `/pay` `/baltop` — a simple coin system, separate from XP.
- **Reaction Roles:** `/reactionrole-panel` posts an embed; `/reactionrole-add` links an emoji on it to a role.
  Members react to self-assign, remove their reaction to unassign.
- **Music:** `/play` `/skip` `/stop` `/leave` `/24-7` `/queue` `/pause` `/nowplaying` `/shuffle` `/remove` `/volume` `/loop` `/music-panel` — streams from SoundCloud in a voice channel and supports Spotify track/album/playlist lookups.

Data (XP, warnings) is stored in flat JSON files under `/data` — no database setup required.

## Setup
1. **Create the bot application:** https://discord.com/developers/applications → New Application →
   Bot tab → Reset Token (copy it) → enable **Server Members Intent** and **Message Content Intent**
   under Privileged Gateway Intents.
2. **Invite it to your server:** OAuth2 → URL Generator → scopes `bot` + `applications.commands` →
   permissions: Administrator (easiest) or the specific perms each command needs. Open the generated URL.
3. **Install dependencies:**
   ```
   npm install
   ```
4. **Configure:** copy `.env.example` to `.env` and fill in `DISCORD_TOKEN`, `CLIENT_ID`
   (Application ID, same page as the bot token), and `GUILD_ID` (right-click your server icon →
   Copy Server ID — enable Developer Mode in Discord settings first).
5. **Edit `config.js`** so the role/channel names match your server exactly (case-sensitive),
   or build the server first using the design doc, then fill this in.
6. **Register slash commands:**
   ```
   npm run deploy
   ```
7. **Start the bot:**
   ```
   npm start
   ```
8. **Build the server automatically:** run `/setup-server` once, as an Admin, anywhere in the server.
   It creates every role, category, channel, and permission overwrite from the blueprint
   (skipping anything that already exists, so it's safe to re-run).
   Afterward, go to **Server Settings → Roles** and drag the bot's own role **above** the roles
   it just created — Discord won't let a bot assign/remove a role positioned above its own.
9. Run `/setup-verification` in the `#verify` channel and `/setup-tickets` in `#create-a-ticket`
   (once each, as an Admin) to post the interactive buttons.

## Required roles/channels (names must match `config.js`)
`/setup-server` creates all of these for you automatically:
- Roles: `Unverified`, `Member`, `Moderator`, `Admin`, plus `Rookie`/`Regular`/`Veteran`/`Elite`/`Legend`
- Channels: `welcome`, `mod-log`, `level-up`, and a category named `Tickets`
(You only need to touch `config.js` if you rename something afterward.)

## Using the new features

**Economy** — works immediately, no setup needed. Members run `/daily` and `/work` to build a balance,
`/pay` to send coins to each other, `/balance` and `/baltop` to check standings. Adjust amounts and
cooldowns under `economy` in `config.js`.

**Reaction Roles** — for each panel you want:
1. Run `/reactionrole-panel title:"Pick your roles" description:"React below!"` in the target channel.
   It replies (visible only to you) with the new message's ID.
2. For each role, run `/reactionrole-add message_id:<that ID> emoji:🎮 role:@Gamer` — the bot reacts
   with the emoji automatically and remembers the link.
3. Members react to get the role, remove their reaction to remove it.
   Custom server emojis: type them as `<:name:id>` (right-click the emoji → Copy ID if unsure).

**Music** — join a voice channel, then `/play <song name, YouTube/SoundCloud URL, or Spotify link>`. The bot searches YouTube first, then SoundCloud,
queues, and starts playback automatically. Spotify links are matched to YouTube first, then SoundCloud audio. `/skip`, `/stop`, `/pause`, `/queue`, and `/nowplaying` control
playback. `/shuffle` randomizes upcoming songs, `/remove position:<number>` removes an upcoming song by
its `/queue` position, `/loop mode:<off|current song|entire queue>` controls repeat, and `/volume
level:<0-100>` adjusts playback volume. `/stop` clears the queue and stays connected; `/leave` disconnects. `/24-7 enabled:true` keeps the bot
in your current voice channel across restarts and automatically reconnects if disconnected. Turn it off
with `/24-7 enabled:false`. SoundCloud playback is transcoded through the included `ffmpeg-static` package.
Run `/music-panel` once in the channel where you want a persistent now-playing controller. Members
can post or replace it; members in the bot's voice channel can pause, resume, skip, stop,
change loop mode, and adjust volume from its buttons. The panel updates as songs play.
After adding or changing commands, run `npm run deploy` and restart the bot.

**Spotify links in `/play`** — Spotify doesn't allow full-song playback outside its own app, so pasting
a Spotify link makes the bot look up the track/artist name(s) and find matching audio on SoundCloud. To enable it:
1. Go to https://developer.spotify.com/dashboard → **Create app**.
2. Give it any name/description. For **Redirect URI**, put anything valid (e.g. `http://localhost:8888`)
   — it's required by Spotify's form but never actually used here.
3. Save, then open **Settings** on the app and copy the **Client ID** and **Client Secret**.
4. Add them to your `.env`:
   ```
   SPOTIFY_CLIENT_ID=your-client-id
   SPOTIFY_CLIENT_SECRET=your-client-secret
   ```
5. Restart the bot. `/play <spotify track/album link>` works right away with just these credentials.

**For Spotify playlists specifically** — Spotify changed their rules in February 2026: reading a
playlist's contents now requires a real logged-in account, not just the app credentials above
(single tracks and albums are unaffected). One more one-time step enables it:
1. Make sure `SPOTIFY_CLIENT_ID`/`SPOTIFY_CLIENT_SECRET` are already in your `.env` (step 4 above).
2. Run:
   ```
   npm run spotify-login
   ```
3. It prints a Spotify login URL — open it, log in with any Spotify account, and approve.
4. Your browser tab will say "Spotify linked!" — that's it, close it. The bot saved what it needs
   under `/data` and will use it automatically from now on (no need to repeat this unless you delete
   that file).
5. Restart the bot (`npm start`) if it was already running. Playlist links now work in `/play`.

## Hosting
This bot needs to run 24/7 to stay online — options include Railway, Render, a VPS, or a Raspberry Pi.
`npm start` works anywhere Node.js 18+ is installed.

## Customizing
- Adjust XP rate, cooldown, and automod word list in `config.js`.
- Add new commands by dropping a file in any `commands/<category>/` folder — it's auto-loaded.
