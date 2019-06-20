const express = require('express');
const os = require('os');
const crypto = require('crypto');
const MobileDetect = require('mobile-detect');
const main = require("../app");
const accountManager = require('../accountManager');
const authorization = require("../authorization");
const minestat = require('../minestat');
const gameServer = require('../gameServer');

const router = express.Router();

router.get('/', function(req, res) {
    accountManager.getInformation("username", "id", authorization.getTokenSubject(req), function(username) {
        let isMobile = (new MobileDetect(req.headers['user-agent'])).mobile() !== null;
        res.render('index', {isMobile: isMobile, username: username, hostname: os.hostname(), address: req.hostname, port: 25565});
    });


});

router.get('/log', function(req, res) {
    res.send(main.getLog().join("\n"));
});

router.get('/log/hash', function(req, res) {
    let hash = crypto.createHash('md5').update(main.getLog().join("\n")).digest('hex');
    res.send(hash);
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
            res.send(JSON.stringify(status));
        });
    });
});


router.post('/command', function(req, res) {
    accountManager.getInformation("privilege", "id", authorization.getTokenSubject(req), function(privilege) {
        accountManager.getInformation("username", "id", authorization.getTokenSubject(req), function(username) {
            if (privilege > 0 || username === "admin") {
                main.command(req.body.command);
                res.status(200).end();
            } else {
                res.status(401).send("Insufficient privilege level");
            }
        });

    });
});


module.exports = router;
