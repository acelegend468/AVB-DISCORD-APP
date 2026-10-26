// Central config: edit the role/channel NAMES to match your server,
// or swap to hard-coded IDs once your server is built.
module.exports = {
  roles: {
    unverified: "Unverified",
    member: "Member",
    mod: "Moderator",
    admin: "Admin",
    levelRoles: [
      { level: 5, name: "Rookie" },
      { level: 10, name: "Regular" },
      { level: 25, name: "Veteran" },
      { level: 50, name: "Elite" },
      { level: 100, name: "Legend" }
    ]
  },
  channels: {
    welcome: "welcome",
    modLog: "mod-log",
    levelUp: "level-up",
    ticketCategory: "Tickets"
  },
  xp: {
    minPerMessage: 15,
    maxPerMessage: 25,
    cooldownSeconds: 60
  },
  economy: {
    currencyName: "Coins",
    currencyIcon: "🪙",
    dailyAmount: 200,
    dailyCooldownMs: 24 * 60 * 60 * 1000,
    workMin: 50,
    workMax: 150,
    workCooldownMs: 60 * 60 * 1000
  },
  music: {
    maxQueueSize: 50,
    idleLeaveMs: 5 * 60 * 1000
  },
  automod: {
    bannedWords: ["examplebadword1", "examplebadword2"],
    maxMentions: 5,
    spamMessageCount: 5,
    spamWindowMs: 7000
  }
};
