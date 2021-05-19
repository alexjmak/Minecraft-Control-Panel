const child_process = require('child_process');
const pidusage = require('pidusage');
const log = require("./core/log")
const net = require("net")
const preferences = require("./preferences")

let gameserver;
const listenerServer = new net.Server();
let running = false;
let onCloseFunction;


function start() {
    if (running) return;
    running = true;
    listenerServer.close();
    const serverJarPath = preferences.get("server");
    const cwd = preferences.get("files");
    const allocatedMemory = preferences.get("memory");

    log.write("Starting server...");

    gameserver = child_process.spawn('java',  ["-Xmx" +  allocatedMemory + "M",  "-Xms" + allocatedMemory + "M", "-jar", serverJarPath, "nogui"], {cwd: cwd});



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
let usernameChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_";
function startListener() {
    const port = 25565;

    log.write("Starting listener server...");

    listenerServer.listen(port);

    listenerServer.on('connection', function(socket) {
        socket.on("data", function(data) {
            let username = data.toString().substring(3);
            let isUsername = true;
            for (let c of username) {
                if (!usernameChars.includes(c)) {
                    isUsername = false;
                    break;
                }
            }
            if (username.length < 3 || username.length > 16) isUsername = false;

            if (isUsername) {
                socket.destroy();
                listenerServer.close(function () {
                    if (!running) start();
                });
            }
        });

        socket.on("error", function(err) {
            console.log(err);
        })

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
                usage.allocatedMemory = allocatedMemory * 1000000;
                resolve(usage);
            } else resolve();
        });
    });
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