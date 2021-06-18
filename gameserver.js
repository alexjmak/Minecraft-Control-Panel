const child_process = require('child_process');
const pidusage = require('pidusage');
const log = require("./core/log")
const net = require("net")
const preferences = require("./preferences")
const minestat = require("./minestat");
const minecraftProtocol = require("minecraft-protocol");

let gameserver;
const listenerServer = new net.Server();
let running = false;
let onCloseFunction;

let consecutiveZeroPlayers = 0;


function start() {
    if (running) return;
    running = true;
    listenerServer.close();
    consecutiveZeroPlayers = 0;
    const serverJarPath = preferences.get("server");
    const cwd = preferences.get("files");
    const allocatedMemory = preferences.get("memory");
    const inactiveAutoStop = preferences.get("inactiveAutoStop");

    log.write("Starting server...");

    gameserver = child_process.spawn('java',  ["-Xmx" +  allocatedMemory + "M",  "-Xms" + allocatedMemory + "M", "-jar", serverJarPath, "nogui"], {cwd: cwd});


    if (inactiveAutoStop) {
        setTimeout(checkInactiveServer, 20 * 60 * 1000);
    }

    gameserver.stderr.on("data", function(data) {
        const text = "[Minecraft] " + data.toString().trimEnd();
        console.log(text);
        log.add(text);
    })

    gameserver.on("close", function () {
        running = false;
        log.write("Server stopped");
        if (onCloseFunction !== undefined) onCloseFunction();
        else startListener();
        setOnCloseFunction(undefined);
    });

    gameserver.stdout.on("data", function(data) {
        const text = "[Minecraft] " + data.toString().trimEnd();
        console.log(text);
        log.add(text);
    });

    return gameserver;
}
function startListener() {
    const port = 25565;

    log.write("Starting listener server...");

    const server = minecraftProtocol.createServer({
        motd: "\u00A7e\u00A7lClick to start server",
        maxPlayers: 1,
        version: "1.17",
        port: port,
    });

    server.on("login", function(client) {
        client.end("Starting server... come back in a minute");
        server.close();
    });

    server.on("close", function() {
        if (!running) start();
    });
}

function isRunning() {
    return running;
}

function setOnCloseFunction(method) {
    onCloseFunction = method;
}

async function getUsage() {
    if (!isRunning()) {
        return;
    }
    return new Promise((resolve, reject) => {
        pidusage(gameserver.pid, function(err, usage) {
            if (err === null) {
                const allocatedMemory = preferences.get("memory");
                usage.allocatedMemory = allocatedMemory * 1000000;
                resolve(usage);
            } else resolve();
        });
    });
}

async function checkInactiveServer() {
    if (!running) return;
    let currentPlayers;
    try {
        currentPlayers = await getOnlinePlayers();
    } catch {
        return setTimeout(checkInactiveServer, 1 * 60 * 1000);
    }
    log.write("Current players: " + currentPlayers);
    if (currentPlayers === 0) {
        consecutiveZeroPlayers++;
        log.write("No players online, checked " + consecutiveZeroPlayers + " times");
        if (consecutiveZeroPlayers >= 10) {
            log.write("Stopping server due to inactivity...")
            command("stop");
        } else {
            // Check again in a minute
            setTimeout(checkInactiveServer, 1 * 60 * 1000);
        }
    } else {
        consecutiveZeroPlayers = 0;
        log.write("Players are online, checking again in 20 minutes");
        // Check again in 20 minutes
        setTimeout(checkInactiveServer, 20 * 60 * 1000);
    }
}
async function getOnlinePlayers() {
    let timeout = 5 * 1000;
    return new Promise((resolve, reject) => {
        setTimeout(reject, timeout);
        minestat.init("localhost", 25565, timeout / 1000,async function() {
            const current_players = minestat.current_players;
            if (isNaN(current_players)) return reject();
            resolve(parseInt(minestat.current_players));
        });
    })

}

function command(command) {
    if (gameserver !== undefined) gameserver.stdin.write(command + "\n");
}

module.exports = {
    start: start,
    startListener: startListener,
    isRunning: isRunning,
    setOnCloseFunction: setOnCloseFunction,
    getUsage: getUsage,
    command: command
};