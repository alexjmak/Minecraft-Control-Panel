const preferences = require("./core/preferences");

preferences.setDefaultConfiguration({
    files: "./Minecraft",
    texture_pack: "texture_pack.zip",
    server: "server.jar",
    memory: 2000,
});

module.exports = preferences;