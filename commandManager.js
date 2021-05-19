const gameServer = require("./gameserver");
const log = require("./core/log");

function command(command, req) {
    if (typeof command !== "object") {
        if (req) log.writeServer(req, command)
        else log.write(command);
    } else {
        command = command.toString();
    }
    command = command.trim();
    if (command.startsWith("/")) command = command.substring(1);
    if (gameServer.isRunning()) {
        switch (command) {
            case "exit":
                gameServer.setOnCloseFunction(function() {
                    process.exit();
                });
                gameServer.command("stop");
                break;
            case "restart":
                gameServer.setOnCloseFunction(gameServer.start);
                gameServer.command("stop");
                break;
            default:
                gameServer.command(command);
                break;
        }

    } else {
        let text;
        switch (command) {
            case "exit":
                process.exit();
                break;
            case "ping":
                text = "pong"
                break;
            case "start":
                gameServer.start();
                break;
            default:
                text = "Command - '" + command + "' not found";
                break;
        }
        if (text) {
            if (req) log.writeServer(req, text)
            else log.write(text);
        }
    }
}

module.exports = command;