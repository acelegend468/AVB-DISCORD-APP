const { ActivityType } = require("discord.js");
const { restoreConnections } = require("../utils/music247");

module.exports = {
  name: "clientReady",
  once: true,
  execute(client) {
    console.log(`Logged in as ${client.user.tag}`);
    client.user.setPresence({
      activities: [{ name: "over the community", type: ActivityType.Watching }],
      status: "online",
    });
    restoreConnections(client);
  },
};
