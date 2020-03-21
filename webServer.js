const express = require('express');
const createError = require('http-errors');
const https = require("https");
const fs = require("fs");
const path = require("path");
const strftime = require('strftime');
const cookieParser = require('cookie-parser');
const helmet = require("helmet");

const authorization = require('./authorization');

const app = express();

const accountsRouter = require('./routes/accounts');
const filesRouter = require('./routes/files');
const indexRouter = require('./routes/index');
const loginRouter = require('./routes/login');
const logoutRouter = require('./routes/logout');
const updateRouter = require('./routes/update');
const propertiesRouter = require('./routes/properties');

log("Starting server...");

app.use(helmet());
app.use(cookieParser());
app.use(express.urlencoded({
    extended: true
}));

app.use(function(req, res, next) {
    if (req.path.endsWith("/") && req.path !== "/") {
        res.redirect(req.path.substring(0, req.path.length - 1));
    } else {
        next();
    }
});

app.use(express.static(path.join(__dirname, "public")));

const noLog = ["/status", "/log", "/log/hash", "/properties/hash", "/accounts/list/hash"];
app.use(function(req, res, next) {
    if (noLog.indexOf(req.path) === -1) log(req, req.url);
    next();
});


app.use('/logout', logoutRouter);
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
    log(req, req.url + " (" + (err.status || 500) + " " + err.message + ")");
    res.status(err.status || 500);
    res.render('error', {message: err.message, status: err.status});
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

function log(req, text) {
    if (typeof req === "string") {
        text = req;
        console.log("[Webserver] [" + strftime("%H:%M:%S") + "]: " + text);
    } else {
        console.log("[Webserver] [" + strftime("%H:%M:%S") + "] [" + (req.ip) + "]: " + req.method + " " + text);
    }
}

module.exports = {
    start: start
};