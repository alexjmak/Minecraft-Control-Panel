const child_process = require('child_process');
const pidusage = require('pidusage');
const log = require("./core/log")
const net = require("net")
const preferences = require("./preferences")
const minestat = require("./minestat");
const minecraftProtocol = require("minecraft-protocol");
const path = require("path");
const fs = require("fs");

let gameserver;
let listenerServer;
let running = false;
let onCloseFunction;

let inactiveServerTimeout;
let consecutiveZeroPlayers = 0;

async function parseServerProperties() {
    return new Promise((resolve, reject) => {
        const cwd = preferences.get("files");
        const propertiesFile = path.join(cwd, "server.properties");
        fs.readFile(propertiesFile, function(err, data) {
            if (err) return reject(err);
            let serverProperties = {};
            const lines = data.toString().split("\n");
            for (let line of lines) {
                line = line.trim();
                if (line.indexOf("#") !== -1) {
                    line = line.substring(0, line.indexOf("#"));
                }
                if (line === "") continue;
                const property = line.split("=")[0];
                const value = line.split("=")[1];
                serverProperties[property] = value;
            }
            resolve(serverProperties);
        });
    });
}

function start() {
    if (running) return;
    running = true;
    if (listenerServer) {
        listenerServer.close();
    }
    if (inactiveServerTimeout) {
        clearTimeout(inactiveServerTimeout);
    }
    consecutiveZeroPlayers = 0;
    const serverJarPath = preferences.get("server");
    const serverArgs = preferences.get("serverArgs");
    const jvmArgs = preferences.get("jvmArgs");
    const cwd = preferences.get("files");
    const allocatedMemory = preferences.get("memory");

    log.write("Starting server...");

    gameserver = child_process.spawn('java',  ["-Xmx" +  allocatedMemory + "M",  "-Xms" + allocatedMemory + "M"].concat(jvmArgs).concat(["-jar", serverJarPath, "nogui"]).concat(serverArgs), {cwd: cwd});

    startCheckInactiveServer();


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
async function startListener() {
    const serverProperties = await parseServerProperties();
    const port = serverProperties["port"];

    log.write("Starting listener server...");

    let motd = "\u00A7e\u00A7lIdle Mode - Join to start server\u00A7r";

    if (serverProperties["motd"]) {
        motd = motd + "\n" + serverProperties["motd"];
    }

    listenerServer = minecraftProtocol.createServer({
        motd: motd,
        maxPlayers: parseInt(serverProperties["max-players"]),
        version: "1.17",
        favicon: path.join(preferences.get("files"), "icon.png"),
        port: port,
    });

    listenerServer.on("login", function(client) {
        log.write(`UUID of player ${client.username} is ${client.uuid}`);
        log.write(`${client.username}[${client.socket.remoteAddress}:${client.socket.remotePort}] logged in`);
        client.on("end", function() {
            log.write(`${client.username} lost connection: Disconnected`);
        });
        client.end("Starting server...\nJoin server again");
        log.write("Stopping listening server")
        listenerServer.on("close", function() {
            if (!running) start();
        });
        listenerServer.close();
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

function checkInactiveServerPlugin(onlinePlayers) {
    if (!running) return;
    const inactiveAutoStop = preferences.get("inactiveAutoStop");
    if (!inactiveAutoStop) return;
    if (inactiveServerTimeout) {
        clearTimeout(inactiveServerTimeout);
    }
    if (onlinePlayers === 0) {
        inactiveServerTimeout = setTimeout(function() {
            log.write("Stopping server due to inactivity...")
            command("stop");
        }, 30 * 60 * 1000)
    }
}

function startCheckInactiveServer() {
    const inactiveAutoStop = preferences.get("inactiveAutoStop");
    const port = 25565;
    if (!inactiveAutoStop) return;
    if (inactiveServerTimeout) {
        clearTimeout(inactiveServerTimeout);
    }
    inactiveServerTimeout = setTimeout(checkInactiveServer.bind(this, port), 20 * 60 * 1000);
}

async function checkInactiveServer(port) {
    if (!running) return;
    let currentPlayers;
    try {
        currentPlayers = await getOnlinePlayers(port);
    } catch {
        inactiveServerTimeout = setTimeout(checkInactiveServer.bind(this, port), 1 * 60 * 1000);
        return;
    }
    if (currentPlayers === 0) {
        consecutiveZeroPlayers++;
        if (consecutiveZeroPlayers >= 10) {
            log.write("Stopping server due to inactivity...")
            command("stop");
        } else {
            // Check again in a minute
            inactiveServerTimeout = setTimeout(checkInactiveServer.bind(this, port), 1 * 60 * 1000);
        }
    } else {
        consecutiveZeroPlayers = 0;
        // Check again in 20 minutes
        inactiveServerTimeout = setTimeout(checkInactiveServer.bind(this, port), 20 * 60 * 1000);
    }
}
async function getOnlinePlayers(port) {
    let timeout = 5 * 1000;
    return new Promise((resolve, reject) => {
        setTimeout(reject, timeout);
        minestat.init("localhost", port, timeout / 1000,async function() {
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
    startCheckInactiveServer: startCheckInactiveServer,
    checkInactiveServerPlugin: checkInactiveServerPlugin,
    getUsage: getUsage,
    command: command
};