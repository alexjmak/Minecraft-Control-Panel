const express = require('express');
const createError = require('http-errors');
const https = require("https");
const fs = require("fs");
const path = require("path");
const cookieParser = require('cookie-parser');
const helmet = require("helmet");

const serverID = require("./core/serverID");
const authorization = require('./core/authorization');
const accountManager = require('./core/accountManager');
const firewall = require('./core/firewall');
const log = require("./core/log");
const preferences = require("./preferences");
const keys = require("./core/keys");
const render = require('./core/render');

const accountsRouter = require("./core/routes/accounts");
const logoutRouter = require("./core/routes/logout");
const loginRouter = require("./core/routes/login");
const firewallRouter = require("./core/routes/firewall");
const indexRouter = require("./routes/index");
const filesRouter = require("./core/routes/files");
const logRouter = require("./core/routes/log");
const languageRouter = require("./core/routes/language");
const updateRouter = require("./core/routes/update");
const app = express();


log.write("Starting server...");


app.use(helmet());
app.use(cookieParser());
app.use(express.json());

app.use(function (req, res, next) {
    if (req.originalUrl === "/") return next();
    let urlCleanup = req.originalUrl.replace(/\/{2,}/g, "/")
        .replace(/\/$/, "");
    if (req.originalUrl !== urlCleanup) {
        return res.redirect(urlCleanup);
    }
    next();
})

const noLog = ["/accounts/list/hash", "/log/raw", "/log/size", "/status"];
app.use(function (req, res, next) {
    if (noLog.indexOf(req.path) === -1) log.writeServer(req, req.method, req.url);
    next();
});

app.use(express.static("./static"));
app.use(express.static("./core/static"));

if (preferences.get("blacklist")) app.use(firewall.blacklist.enforce);
if (preferences.get("whitelist")) app.use(firewall.whitelist.enforce);

app.use("/logout", logoutRouter);
app.use("/login", loginRouter);
app.use("/language", languageRouter);
app.use(authorization.doAuthorization);
app.use("/accounts", accountsRouter);
app.use("/log", logRouter);
app.use("/update", updateRouter);
app.use("/firewall", firewallRouter);
app.use("/Minecraft", filesRouter());
app.use("/", indexRouter);


app.enable("trust proxy");

app.use(function (req, res, next) {
    next(createError(404));
});

app.use(function (err, req, res, next) {
    log.writeServer(req, req.method, req.url + " (" + (err.status || 500) + " " + err.message + ")");
    res.status(err.status || 500);
    if (res.headersSent) return;
    render("error", {message: err.message, status: err.status}, req, res, next)
});

app.set('views', ".");
app.set('view engine', 'pug');


function start() {
    log.write(`Starting server on port ${preferences.get("port")}...`);
    const httpsServer = https.createServer(keys.https, app);
    httpsServer.listen(preferences.get("port"));
}

module.exports = {
    start: start
};