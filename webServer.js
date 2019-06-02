const express = require('express');
const createError = require('http-errors');
const https = require("https");
const fs = require("fs");
const path = require("path");
const cookieParser = require('cookie-parser');
const helmet = require("helmet");

const authorization = require('./authorization');

const accountsRouter = require('./routes/accounts');
const filesRouter = require('./routes/files');
const indexRouter = require('./routes/index');
const loginRouter = require('./routes/login');
const propertiesRouter = require('./routes/properties');


const app = express();

app.use(helmet());
app.use(cookieParser());

app.use(express.static(path.join(__dirname, "public")));
app.use('/login', loginRouter);

app.use(authorization.doAuthorization);

app.use("/files", filesRouter);
app.use('/', indexRouter);

app.use(function(req, res, next) {
    next(createError(404));
});

app.use(function(err, req, res, next) {
    console.log(err);
    res.status(err.status || 500);
    res.render('error', {title: "Minecraft Control Panel", message: err.message, status: err.status});
});

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');


function start() {
    let httpsServer = https.createServer({
        key: fs.readFileSync("./keys/https/key.key"),
        cert: fs.readFileSync("./keys/https/cert.crt")
    }, app);
    httpsServer.listen(443);

    httpRedirectServer();

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