const preferences = require("./core/preferences");

preferences.setDefaultConfiguration({
    files: "./Minecraft",
    texture_pack: "texture_pack.zip",
    server: "server.jar",
    serverArgs: [],
    jvmArgs: [],
    memory: 2000,
    inactiveAutoStop: true
});

module.exports = preferences;