const gameServer = require("./gameServer");

let log = [];

function command(command) {
    if (gameServer.isRunning()) {
        gameServer.command(command)
    } else {
        console.log(command);
        if (command === "start") {
            gameServer.start("./Minecraft");
        }

    }

}

function getLog() {
    return log;
}

console.log = function(text) {
    process.stdout.write(text + "\n");
    log.push(text);
};

module.exports = {
    command: command,
    getLog: getLog
};

const webServer = require("./webServer");
webServer.start();

//gameServer.start("./Minecraft");


