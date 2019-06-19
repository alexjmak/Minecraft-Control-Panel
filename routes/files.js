const express = require('express');
const router = express.Router();
const path = require("path");
const fs = require("fs");
const MobileDetect = require("mobile-detect");
const os = require('os');
const url = require('url');
const accountManager = require('../accountManager');
const authorization = require('../authorization');

router.get('/*', function(req, res, next) {
    let filePath = url.parse(req.url).pathname;
    let realFilePath = path.join("./Minecraft", filePath);
    let urlFilePath = path.join(req.baseUrl, filePath);

    fs.stat(realFilePath, function(err, stats) {
        if (err == null) {
            if (Object.keys(req.query)[0] === "edit") {
                if (stats.isDirectory()) {
                    res.redirect(urlFilePath);
                    return;
                }
                accountManager.getInformation("username", "id", authorization.getTokenSubject(req), function (username) {
                    fs.readFile(realFilePath, function (err, contents) {
                        let isMobile = (new MobileDetect(req.headers['user-agent'])).mobile() !== null;
                        res.render('fileEditor', {
                            isMobile: isMobile,
                            username: username,
                            hostname: os.hostname(),
                            file: {path: urlFilePath}
                        });
                    });
                });
            } else {
                if (stats.isDirectory()) {
                    fs.readdir(realFilePath, function(err, files) {
                        if (err === null) {
                            accountManager.getInformation("username", "id", authorization.getTokenSubject(req), function (username) {
                                fs.readdir(realFilePath, function (err, files) {
                                    let isMobile = (new MobileDetect(req.headers['user-agent'])).mobile() !== null;
                                    res.render('directory', {
                                        isMobile: isMobile,
                                        username: username,
                                        hostname: os.hostname(),
                                        directory: {path: urlFilePath, files: files}
                                    });

                                });
                            });
                        } else next();

                    });
                } else {
                    fs.readFile(realFilePath, function (err, contents) {
                        if (err === null) {
                            res.send(contents);
                        } else next();

                    });
                }
            }
        } else next();
    });

});

module.exports = router;
