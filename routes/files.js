const express = require('express');
const router = express.Router();
const fs = require("fs");
const os = require('os');
const url = require('url');
const readify = require('readify');
const accountManager = require('../accountManager');
const authorization = require('../authorization');

router.get('/*', function(req, res, next) {
    let filePath = decodeURIComponent(url.parse(req.url).pathname).substring(1);
    let realFilePath = [".", "Minecraft", filePath].join("/");
    let urlFilePath = [req.baseUrl, filePath].join("/");

    fs.stat(realFilePath, function(err, stats) {
        if (err == null) {
            if (Object.keys(req.query)[0] === "download") {
                if (stats.isDirectory()) {
                    res.redirect(urlFilePath);
                } else {
                    fs.readFile(realFilePath, function (err, contents) {
                        if (err === null) {
                            res.send(contents);
                        } else next();

                    });
                }
            } else {
                if (stats.isDirectory()) {
                    fs.readdir(realFilePath, function(err, files) {
                        if (err === null) {

                            accountManager.getInformation("username", "id", authorization.getLoginTokenAudience(req), function (username) {
                                readify(realFilePath, {sort: 'type'}).then(function(files) {
                                    res.render('directory', {
                                        username: username,
                                        hostname: os.hostname(),
                                        directory: {path: filePath, files: JSON.stringify(files.files)}
                                    });
                                });
                            });
                        } else next();

                    });
                } else {
                    accountManager.getInformation("username", "id", authorization.getLoginTokenAudience(req), function (username) {
                        fs.readFile(realFilePath, function (err, contents) {
                            res.render('fileEditor', {
                                username: username,
                                hostname: os.hostname(),
                                file: {path: urlFilePath}
                            });
                        });
                    });
                }

            }
        } else next();
    });
});

router.delete("/*", function(req, res, next) {
    let filePath = decodeURIComponent(url.parse(req.url).pathname).substring(1);
    let realFilePath = [".", "Minecraft", filePath].join("/");
    let deleteFilePath = [".", "Minecraft", ".recycle", filePath].join("/");
    let deleteFilePathParent = deleteFilePath.split("/");
    deleteFilePathParent.pop();
    deleteFilePathParent = deleteFilePathParent.join("/");

    if (fs.existsSync(realFilePath)) {
        fs.mkdir(deleteFilePathParent, {recursive: true }, function(err) {
            if (err) {
                console.log(err);
                res.sendStatus(404)
            } else {
                fs.rename(realFilePath, deleteFilePath, function (err) {
                    if (err) {
                        console.log(err);
                        res.sendStatus(404)
                    } else {
                        res.sendStatus(200)
                    }
                });
            }
        });
    } else {
        res.sendStatus(404)
    }

});
module.exports = router;
