const express = require('express');
const createError = require('http-errors');
const https = require("https");
const fs = require("fs");
const path = require("path");
const cookieParser = require('cookie-parser');
const fileUpload = require("express-fileupload");
const helmet = require("helmet");
const log = require("./log")
const accountManager = require('./accountManager');
const authorization = require('./authorization');
const blacklist = require('./blacklist')

const app = express();

const accountsRouter = require('./routes/accounts');
const filesRouter = require('./routes/files');
const indexRouter = require('./routes/index');
const loginRouter = require('./routes/login');
const logoutRouter = require('./routes/logout');
const updateRouter = require('./routes/update');
const propertiesRouter = require('./routes/properties');

log.write("Starting server...");

app.use(helmet());
app.use(cookieParser());
app.use(fileUpload());
app.use(express.json());

app.use(function(req, res, next) {
    if (req.path.endsWith("/") && req.path !== "/") {
        res.redirect(req.path.substring(0, req.path.length - 1));
    } else {
        next();
    }
});

app.use(express.static(path.join(__dirname, "static")));

const noLog = ["/command", "/status", "/log", "/log/size", "/properties/hash", "/accounts/list/hash"];
app.use(function(req, res, next) {
    if (noLog.indexOf(req.path) === -1) log.writeServer(req, req.method, req.url);
    next();
});

app.use('/logout', logoutRouter);
app.use(function(req, res, next) {
    if (blacklist.contains(req.ip) || !req.ip) {
        next(createError(403, "Blacklisted from server"));
    } else {
        next();
    }
})
app.use('/login', loginRouter);
app.use("/update", updateRouter);
app.use(authorization.doAuthorization);
app.use('/', indexRouter);
app.use("/files", filesRouter);
app.use("/accounts", accountsRouter);
app.use("/properties", propertiesRouter);


app.enable("trust proxy");

app.use(function(req, res, next) {

    next(createError(404));
});

app.use(function(err, req, res, next) {
    log.writeServer(req, req.method, req.url + " (" + (err.status || 500) + " " + err.message + ")");
    res.status(err.status || 500);
    if (res.headersSent) return;
    accountManager.getInformation("username", "id", authorization.getLoginTokenAudience(req), function(username) {
        res.render('error', {message: err.message, status: err.status, username: username});
    });
});

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');


function start() {
    let httpsServer = https.createServer({
        key: fs.readFileSync("./keys/https/key.key"),
        cert: fs.readFileSync("./keys/https/cert.crt")
    }, app);
    httpsServer.listen(25564);

    //httpRedirectServer();

    return httpsServer;
}

function httpRedirectServer() {
    let httpServer = express();
    httpServer.get('*', function(req, res) {
        res.redirect('https://' + req.headers.host + req.url);
    });
    httpServer.listen(80);
    return httpServer;
}

module.exports = {
    start: start
};