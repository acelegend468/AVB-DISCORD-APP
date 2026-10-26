// Diagnostic only - prints which audio/encryption/ffmpeg pieces @discordjs/voice
// actually found on this machine. Run with: npm run voice-check
const { generateDependencyReport } = require("@discordjs/voice");
console.log(generateDependencyReport());
