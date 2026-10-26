const { load, save } = require("./db");

// Structure: { [messageId]: { [emoji]: roleId } }
function getMapping(messageId) {
  const data = load("reactionroles");
  return data[messageId] || null;
}

function addMapping(messageId, emoji, roleId) {
  const data = load("reactionroles");
  data[messageId] = data[messageId] || {};
  data[messageId][emoji] = roleId;
  save("reactionroles", data);
}

function removeMessage(messageId) {
  const data = load("reactionroles");
  delete data[messageId];
  save("reactionroles", data);
}

module.exports = { getMapping, addMapping, removeMessage };
