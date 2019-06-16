const child_process = require('child_process');
let pidusage = require('pidusage');

let gameServer;
let allocatedMemory = 2048;
let running = false;

function start(cwd) {
    gameServer = child_process.spawn('java',  ["-Xmx" +  allocatedMemory + "M",  "-Xms" + allocatedMemory + "M", "-jar", "server.jar", "nogui"], {cwd: cwd});

    running = true;

    gameServer.on('close', function (code) {
        running = false;
        log('Game server stopped');
    });

    gameServer.stdout.on("data", function(data) {
        log(data.toString().trimEnd());
    });
    process.stdin.pipe(gameServer.stdin);

    return gameServer;
}

function isRunning() {
    return running;
}

function getUsage(next) {
    if (!isRunning()) {
        if (next !== undefined) next();
        return;
    }
    pidusage(gameServer.pid, function(err, usage) {
        usage.allocatedMemory = allocatedMemory * 1000000;
        if (next !== undefined) next(usage);
    });
}

function command(command) {
    console.log(command);
    if (gameServer != undefined) gameServer.stdin.write(command + "\n");
}

function log(text) {
    console.log("[Gameserver] " + text);
}

module.exports = {
    start: start,
    isRunning: isRunning,
    getUsage: getUsage,
    command: command
};