const { handleVoiceStateUpdate } = require("../utils/music247");

module.exports = {
  name: "voiceStateUpdate",
  execute(oldState, newState, client) {
    handleVoiceStateUpdate(oldState, newState, client);
  },
};
