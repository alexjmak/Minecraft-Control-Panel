const express = require('express');
const fs = require("fs");
const path = require("path");
const commandManager = require('../commandManager');
const authorization = require("../core/authorization");
const preferences = require("../core/preferences");
const minestat = require('../minestat');
const gameServer = require('../gameserver');
const log = require("../core/log");
const fileManager = require("../core/fileManager");
const render = require("../core/render");
const notifications = require("../notifications");

const router = express.Router();

router.get('/', function(req, res, next) {
    render('index', {address: req.hostname, port: 25565}, req, res, next);
});

router.get('/texture_pack.zip', async function(req, res, next) {
    const parent = preferences.get("files");
    const texturePack = preferences.get("texture_pack");
    if (!parent || !texturePack) return res.sendStatus(404);
    let filePath = path.join(parent, texturePack);
    filePath = path.resolve(filePath);
    const fileStream = await fileManager.readFile(filePath)
    fileManager.downloadFile(fileStream, "texture_pack.zip", req, res, next);
});

router.get('/status', function(req, res, next) {
    minestat.init(req.hostname, 25565, async function() {
        const usage = await gameServer.getUsage();
        const status = Object.assign({}, minestat);
        if (usage) {
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

router.post('/notifications', function(req, res, next) {
    const timestamp = req.body.timestamp;
    res.json(notifications.get(timestamp));
});

router.use((req, res, next) => authorization.checkPrivilege(req, res, next, 1));

router.post('/command', function(req, res, next) {
    commandManager(req.body.command, req);
    res.status(200).end();
});


module.exports = router;
