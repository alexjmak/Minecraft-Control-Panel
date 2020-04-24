const gameServer = require("./gameserver");
const commandManager = require("./commandManager");
const webServer = require("./webserver");
webServer.start();

process.stdin.on("data", commandManager);

process.on('SIGINT', function () {
    if (gameServer.isRunning()) {
        commandManager("exit");
    } else {
        process.exit();
    }
});
