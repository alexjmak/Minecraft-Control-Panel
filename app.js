process.chdir(__dirname);

const gameServer = require("./gameserver");
const commandManager = require("./commandManager");

const webServer = require("./webserver");

require("./preferences")

process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

webServer.start();

process.stdin.on("data", commandManager);

process.on('SIGINT', function () {
    if (gameServer.isRunning()) {
        commandManager("exit");
    } else {
        process.exit();
    }
});
