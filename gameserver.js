const child_process = require('child_process');
const pidusage = require('pidusage');
const log = require("./log")

let gameserver;
let allocatedMemory = 5000; //MB
let running = false;
let onCloseFunction;

function start(cwd) {
    log.write("Starting server...");

    gameserver = child_process.spawn('java',  ["-Xmx" +  allocatedMemory + "M",  "-Xms" + allocatedMemory + "M", "-jar", "server.jar", "nogui"], {cwd: cwd});

    running = true;

    gameserver.on('error', function(err) {
        log.write(err);
    });

    gameserver.on('close', function (code) {
        running = false;
        log.write("Server stopped");
        if (onCloseFunction !== undefined) onCloseFunction(cwd);
        setOnCloseFunction(undefined);
    });

    gameserver.stdout.on("data", function(data) {
        log.writeRaw("[Minecraft] " + data.toString().trimEnd());
    });

    return gameserver;
}

function isRunning() {
    return running;
}

function setOnCloseFunction(method) {
    onCloseFunction = method;
}

function getUsage(next) {
    if (!isRunning()) {
        if (next !== undefined) next();
        return;
    }
    pidusage(gameserver.pid, function(err, usage) {
        if (err === null) {
            usage.allocatedMemory = allocatedMemory * 1000000;
            if (next !== undefined) next(usage);
        } else next();

    });
}

function command(command) {
    if (gameserver !== undefined) gameserver.stdin.write(command + "\n");
}

module.exports = {
    start: start,
    isRunning: isRunning,
    setOnCloseFunction: setOnCloseFunction,
    getUsage: getUsage,
    command: command
};