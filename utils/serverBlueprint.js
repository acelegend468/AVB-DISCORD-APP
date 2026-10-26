// The full server structure, as data. setup-server.js reads this to create everything.
const { PermissionFlagsBits, ChannelType } = require("discord.js");

const ROLES = [
  // name, color (hex), hoist (shown separately in member list), permissions (optional)
  { name: "Unverified", color: "#95A5A6", hoist: false },
  { name: "Member", color: "#3498DB", hoist: false },
  { name: "Booster", color: "#F47FFF", hoist: true },
  { name: "Trial Mod", color: "#1ABC9C", hoist: true },
  {
    name: "Moderator",
    color: "#57F287",
    hoist: true,
    permissions: [
      PermissionFlagsBits.KickMembers,
      PermissionFlagsBits.BanMembers,
      PermissionFlagsBits.ModerateMembers,
      PermissionFlagsBits.ManageMessages,
    ],
  },
  { name: "Admin", color: "#E67E22", hoist: true, permissions: [PermissionFlagsBits.Administrator] },
  // Progression roles (auto-assigned by the bot as members level up)
  { name: "Rookie", color: "#B0E0E6" },
  { name: "Regular", color: "#87CEEB" },
  { name: "Veteran", color: "#4682B4" },
  { name: "Elite", color: "#9B59B6" },
  { name: "Legend", color: "#F1C40F" },
  // Self-assignable interest roles
  { name: "Gamer", color: "#E74C3C" },
  { name: "PC Builder", color: "#95A5A6" },
  { name: "Linux User", color: "#2ECC71" },
  { name: "Windows Optimizer", color: "#3498DB" },
  { name: "Free Fire", color: "#E67E22" },
  { name: "Event Pings", color: "#F1C40F" },
  { name: "Streamer/Creator", color: "#9B59B6" },
];

// Categories + their text/voice channels.
// visibility: "public" (everyone incl. Unverified), "member" (Member role required), "staff" (Moderator+ only)
const STRUCTURE = [
  {
    category: "📋 INFORMATION",
    visibility: "public",
    channels: [
      { name: "welcome", type: "text" },
      { name: "rules", type: "text", readonly: true },
      { name: "verify", type: "text", readonly: true },
      { name: "announcements", type: "text", readonly: true },
      { name: "roles", type: "text", readonly: true },
    ],
  },
  {
    category: "💬 COMMUNITY",
    visibility: "member",
    channels: [
      { name: "general-chat", type: "text" },
      { name: "introductions", type: "text" },
      { name: "memes", type: "text" },
      { name: "media", type: "text" },
      { name: "off-topic", type: "text" },
      { name: "suggestions", type: "text" },
    ],
  },
  {
    category: "🎮 GAMING",
    visibility: "member",
    channels: [
      { name: "gaming-general", type: "text" },
      { name: "free-fire", type: "text" },
      { name: "looking-for-group", type: "text" },
      { name: "clips-and-highlights", type: "text" },
      { name: "tournaments-and-events", type: "text" },
      { name: "Gaming Squad 1", type: "voice" },
      { name: "Gaming Squad 2", type: "voice" },
      { name: "Gaming Squad 3", type: "voice" },
      { name: "Gaming Squad 4", type: "voice" },
    ],
  },
  {
    category: "🖥️ PC & TECH",
    visibility: "member",
    channels: [
      { name: "pc-builds", type: "text" },
      { name: "optimization-tips", type: "text" },
      { name: "tech-support", type: "text" },
      { name: "software-and-tools", type: "text" },
    ],
  },
  {
    category: "🏆 PROGRESSION",
    visibility: "member",
    channels: [
      { name: "level-up", type: "text", readonly: true },
      { name: "leaderboard-info", type: "text", readonly: true },
      { name: "giveaways", type: "text", readonly: true },
    ],
  },
  {
    category: "🎫 SUPPORT",
    visibility: "member",
    channels: [{ name: "create-a-ticket", type: "text", readonly: true }],
  },
  {
    category: "🔊 VOICE CHANNELS",
    visibility: "member",
    channels: [
      { name: "AFK", type: "voice" },
      { name: "Lounge 1", type: "voice" },
      { name: "Lounge 2", type: "voice" },
      { name: "Music / Study Room", type: "voice" },
    ],
  },
  {
    category: "🔒 STAFF",
    visibility: "staff",
    channels: [
      { name: "staff-chat", type: "text" },
      { name: "mod-log", type: "text" },
      { name: "reports", type: "text" },
      { name: "bot-commands", type: "text" },
      { name: "Staff VC", type: "voice" },
    ],
  },
  {
    // Empty category the bot drops live ticket channels into - no channels created here up front.
    category: "Tickets",
    visibility: "staff",
    channels: [],
  },
];

module.exports = { ROLES, STRUCTURE };
