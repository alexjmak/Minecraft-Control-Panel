const express = require('express');
const os = require('os');
const crypto = require('crypto');
const fs = require("fs");
const path = require("path");
const createError = require("http-errors");
const accountManager = require('../accountManager');
const commandManager = require('../commandManager');
const authorization = require("../authorization");
const minestat = require('../minestat');
const gameServer = require('../gameserver');
const log = require("../log");

const router = express.Router();

router.get('/', function(req, res) {
    accountManager.getInformation("username", "id", authorization.getLoginTokenAudience(req), function(username) {
        res.render('index', {username: username, hostname: os.hostname(), address: req.hostname, port: 25565});
    });
});

router.get('/texture-pack.zip', function(req, res, next) {
    let file = path.resolve("./Minecraft/texture-pack.zip");
    try {
        let stream = fs.createReadStream(file);
        res.set('content-disposition', "attachment");
        stream.pipe(res);
    } catch {
        next(createError(404));
    }

});

router.get('/log', function(req, res, next) {
    let send = log.get();
    let start = req.query.start;
    if (start) {
        start = parseInt(start);
        if (Number.isInteger(start) && 0 <= start && start < send.length) send = send.substring(start);
    }
    res.send(send);
});

router.get('/log/size', function(req, res) {
    let hash = log.get().length;
    res.send(hash.toString());
});

router.get('/status', function(req, res) {
    minestat.init(req.hostname, 25565, function() {
        gameServer.getUsage(function(usage) {
            let status = Object.assign({}, minestat);
            if (usage !== undefined) {
                status.cpu = usage.cpu;
                status.memory = usage.memory;
                status.allocatedMemory = usage.allocatedMemory;
                status.elapsed = usage.elapsed;
            }
            if (!res.headersSent) {
                res.send(JSON.stringify(status));
            }
        });
    });
});

router.post('/command', function(req, res) {
    accountManager.getInformation("privilege", "id", authorization.getLoginTokenAudience(req), function(privilege) {
        accountManager.getInformation("username", "id", authorization.getLoginTokenAudience(req), function(username) {
            if (privilege > 0 || username === "admin") {
                commandManager(req.body.command, req);
                res.status(200).end();
            } else {
                res.status(401).send("Insufficient privilege level");
            }
        });

    });
});


module.exports = router;
