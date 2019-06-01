const express = require('express');
const https = require("https");
const fs = require("fs");
const path = require("path");
const cookieParser = require('cookie-parser');
const helmet = require("helmet");
const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');

const options = {
    key: fs.readFileSync("key.key"),
    cert: fs.readFileSync("cert.crt")
};

const app = express();

app.use(helmet());
app.use(cookieParser());

app.use(express.static(path.join(__dirname, "public")));
app.use("/Minecraft", express.static(path.join(__dirname, "Minecraft")));
app.use('/', indexRouter);
app.use('/users', usersRouter);

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');


function start() {
    let httpsServer = https.createServer(options, app);
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