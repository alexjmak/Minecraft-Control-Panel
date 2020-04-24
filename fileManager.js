const archiver = require('archiver');
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const preferences = require("./preferences");
const log = require("./log");

let deleteFile = function(filePath, next) {
    let realFilePath = path.join(preferences.get("files"), filePath);
    let deleteFilePath = path.join(preferences.get("files"), ".recycle", filePath);
    let deleteFilePathParent = deleteFilePath.split("/");
    deleteFilePathParent.pop();
    deleteFilePathParent = deleteFilePathParent.join("/");

    if (fs.existsSync(realFilePath)) {
        fs.mkdir(deleteFilePathParent, {recursive: true }, function(err) {
            if (!err) {
                fs.rename(realFilePath, deleteFilePath, function (err) {
                    if (err) {
                        log.write(err);
                        if (next !== undefined) next(false);
                    } else {
                        if (next !== undefined) next(true);
                    }
                });
            } else {
                log.write(err);
                if (next !== undefined) next(false);
            }
        });
    } else {
        if (next !== undefined) next(false);
    }
};

let createFolderArchive = function(filePath, next) {
    let folderPath = path.join(preferences.get("files"), filePath);
    let outputArchiveName = "download-" + crypto.randomBytes(4).toString("hex") + ".zip";
    let outputPath = path.join(preferences.get("files"), outputArchiveName);

    let fileOutput = fs.createWriteStream(outputPath);
    fileOutput.on('error', function(err) {
        log.write(err);
    });
    fileOutput.on('close', function () {
        if (next !== undefined) next(path.resolve(outputPath))
    });

    let archive = archiver('zip');
    archive.on('error', function(err) {
        log.write(err);
    });
    archive.pipe(fileOutput);
    archive.directory(folderPath, false);
    archive.finalize();
};

let readFile = function(filePath, next) {
    fs.readFile(filePath, function (err, contents) {
        if (next !== undefined) next(contents);
    });
};

let writeFile = function(filePath, data, next) {
    fs.writeFile(filePath, data, function(err) {
        if (err) {
            if (next) next(err);
        } else {
            if (next) next();
        }
    });

};

let writeFiles = function(files, saveDirectory, next) {
    if (!files || Object.keys(files).length === 0) {
        if (next !== undefined) return next(false);
    }

    let returnErr;

    for (let file in files) {
        if (!files.hasOwnProperty(file)) continue;
        file = files[file];
        let saveLocation = path.join(saveDirectory, file.name);

        writeFile(saveLocation, file.data, function(err) {
            if (err && returnErr === undefined) returnErr = err;
        })
    }
    if (next !== undefined) return next(returnErr);
};


module.exports = {deleteFile: deleteFile,
                  createFolderArchive: createFolderArchive,
                  readFile: readFile,
                  writeFile: writeFile,
                  writeFiles: writeFiles};