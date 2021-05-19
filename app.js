process.chdir(__dirname);

const preferences = require("./preferences");
preferences.init();

const gameServer = require("./gameserver");
const commandManager = require("./commandManager");



const webServer = require("./webserver");



process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

webServer.start();
gameServer.startListener();

process.stdin.on("data", commandManager);

process.on('SIGINT', function () {
    if (gameServer.isRunning()) {
        commandManager("exit");
    } else {
        process.exit();
    }
});
