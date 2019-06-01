let spawn = require('child_process').spawn;

let gameServer;

function start(cwd) {
    gameServer = spawn('java',  ["-Xmx2048M",  "-Xms2048M", "-jar", "server.jar", "nogui"], {cwd: cwd});

    gameServer.on('close', function (code) {
        console.log('Game server stopped');
    });

    gameServer.stdout.pipe(process.stdout);
    process.stdin.pipe(gameServer.stdin);

    return gameServer;
}

function command(command) {
    console.log(command);
    gameServer.stdin.write(command + "\n");
}

module.exports = {
    start: start,
    command: command
};