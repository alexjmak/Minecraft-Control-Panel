const webServer = require("./webServer");
webServer.start();

const gameServer = require("./gameServer");
gameServer.start("./Minecraft");
