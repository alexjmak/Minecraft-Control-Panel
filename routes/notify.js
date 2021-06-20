const express = require('express');
const authorization = require("../core/authorization");
const log = require("../core/log");
const gameserver = require("../gameserver");

const router = express.Router();

router.use(function(req, res, next) {
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
        const token = req.headers.authorization.substring("Bearer ".length);
        const isValidToken = authorization.verifyToken(token, req).sub === "notifyToken";
        if (isValidToken) return next();
    }
    res.sendStatus(401);
});

router.post('/plugin/enable', function(req, res) {
    log.write(`Connected to MCPNotify plugin`);
    const onlinePlayers = req.body["onlinePlayers"];
    gameserver.checkInactiveServerPlugin(onlinePlayers);
    res.sendStatus(200);
});

router.post('/plugin/disable', function(req, res) {
    log.write(`Disconnected from MCPNotify plugin`);

    gameserver.startCheckInactiveServer();
    res.sendStatus(200);
});


router.post('/player/login', function(req, res) {
    const username = req.body["username"];
    const ip = req.body["ip"];
    const result = req.body["result"];

    log.write(`${username} login ${result} from ${ip}`);
    gameserver.checkInactiveServerPlugin(1);
    res.sendStatus(200);
});

router.post('/player/quit', function(req, res) {
    const username = req.body["username"];
    const onlinePlayers = req.body["onlinePlayers"];

    log.write(`${username} left the game`);
    gameserver.checkInactiveServerPlugin(onlinePlayers);
    res.sendStatus(200);
});

module.exports = router;