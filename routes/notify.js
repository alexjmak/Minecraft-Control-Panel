const express = require('express');
const authorization = require("../core/authorization");
const log = require("../core/log");

const router = express.Router();

router.use(function(req, res, next) {
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
        const token = req.headers.authorization.substring("Bearer ".length);
        const isValidToken = authorization.verifyToken(token, req).sub === "notifyToken";
        if (isValidToken) return next();
    }
    res.sendStatus(401);
});

router.post('/player/login', function(req, res) {
    const username = req.body.username;
    const ip = req.body.ip;
    const result = req.body.result;
    log.write(`${username} login ${result} from ${ip}`);
    res.sendStatus(200);
});

router.post('/player/quit', function(req, res) {
    const username = req.body.username;
    log.write(`${username} left the game`);
    res.sendStatus(200);
});

module.exports = router;