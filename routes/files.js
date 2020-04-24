const express = require('express');
const fs = require("fs");
const createError = require('http-errors');
const os = require('os');
const path = require("path");
const readify = require('readify');
const url = require('url');

const accountManager = require('../accountManager');
const authorization = require('../authorization');
const fileManager = require('../fileManager');
const preferences = require("../preferences");

const router = express.Router();

router.get('/*', function(req, res, next) {
    let filePath = decodeURIComponent(url.parse(req.url).pathname).substring(1);
    let realFilePath = path.join(preferences.get("files"), filePath);

    const parameter = Object.keys(req.query)[0];

    fs.stat(realFilePath, function(err, stats) {
        if (err !== null) return next();
        if (stats.isDirectory()) {
            switch(parameter) {
                case "download":
                    fileManager.createFolderArchive(filePath, function(archivePath) {
                        res.download(archivePath, path.basename(filePath + ".zip"), function() {
                            fs.unlinkSync(archivePath);
                        });
                    });
                    break;
                default:
                    fs.readdir(realFilePath, function (err, files) {
                        if (err !== null) return next();
                        accountManager.getInformation("username", "id", authorization.getLoginTokenAudience(req), function (username) {
                            readify(realFilePath, {sort: 'type'}).then(function (files) {
                                res.render('directory', {
                                    username: username,
                                    hostname: os.hostname(),
                                    directory: {path: filePath, files: JSON.stringify(files.files)}
                                });
                            });
                        });
                    });
                    break;
            }
        } else {
            switch(parameter) {
                case "download":
                    fileManager.readFile(realFilePath, function(contents) {
                        if (err === null) res.send(contents);
                        else next();
                    });
                    break;
                default:
                    accountManager.getInformation("username", "id", authorization.getLoginTokenAudience(req), function (username) {
                        fs.readFile(realFilePath, function (err, contents) {
                            res.render('fileViewer', {
                                username: username,
                                hostname: os.hostname()
                            });
                        });
                    });
                    break;
            }
        }
    });
});

router.use(function(req, res, next) {
    let id = authorization.getLoginTokenAudience(req);
    accountManager.getInformation("privilege", "id", id, function(privilege) {
        if (privilege === 100) next();
        else res.status(403).send("Insufficient privilege level");
    });
});

router.post("/*", function(req, res, next) {
    let filePath = decodeURIComponent(url.parse(req.url).pathname).substring(1);
    let realFilePath = path.join(preferences.get("files"), filePath);

    const parameter = Object.keys(req.query)[0];

    fs.stat(realFilePath, function(err, stats) {
        if (err !== null && next !== undefined) return next();
        if (parameter === "upload") {
            if (stats.isDirectory()) {
                fileManager.writeFiles(req.files, realFilePath, function(err) {
                    if (err !== undefined) return res.status(500).send("Upload failed");
                    if (Object.keys(req.files).length === 1) res.send("Uploaded file");
                    else res.send("Uploaded files");
                });
            }
        }
    });
});

router.put("/*", function(req, res, next) {
    let filePath = decodeURIComponent(url.parse(req.url).pathname).substring(1);
    let realFilePath = path.join(preferences.get("files"), filePath);
    let fileContents = req.files.data.data;

    if (fileContents) {
        fileManager.writeFile(realFilePath, fileContents, function(err) {
            if (err) res.status(500).send("Save failed");
            else res.send("Saved file");
        })
    } else {
        res.status(400).send("No contents");
    }
});


router.delete("/*", function(req, res, next) {
    let filePath = decodeURIComponent(url.parse(req.url).pathname).substring(1);
    fileManager.deleteFile(filePath, function(result) {
        if (result) res.sendStatus(200);
        else res.sendStatus(404);
    });
});

module.exports = router;
