const os = require("os");
const fs = require('fs');
const jwt = require("jsonwebtoken");
const createError = require('http-errors');

const secretKey = fs.readFileSync('./keys/jwt/secret.key', 'utf8');

function verifyToken(token){
    try {
        return jwt.verify(token, secretKey, {issuer: os.hostname()});
    } catch (err) {
        return false;
    }
}

function createToken(subject) {
    return jwt.sign({issuer: os.hostname(), subject: subject}, secretKey, {expiresIn: "7d"});
}

async function doAuthorization(req, res, next) {
    if (req.headers.authorization != undefined) {
        if (req.headers.authorization.startsWith("Bearer ")) {
            if (!verifyToken(req.headers.authorization.substring("Bearer ".length))) {
                next();
                return;
            }
        }
    } else if (req.cookies.token != undefined) {
        if (!verifyToken(req.cookies.token)) {
            next();
            return;
        }
    }
    res.redirect("/login");
}

async function login(req, res, next) {
    let response = "Invalid username and/or password";
    if (req.headers.authorization != undefined) {
        const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
        const strauth = new Buffer(b64auth, 'base64').toString();
        const splitIndex = strauth.indexOf(':');
        const username = strauth.substring(0, splitIndex);
        const password = strauth.substring(splitIndex + 1);

        if (username == "admin" & password == "x") {
            res.cookie("token", createToken(username), {path: "/", secure: true, sameSite: "strict"});
            next();
            return;
        }

    }

    next(res.status(401).send(response));
}

module.exports = {
    doAuthorization: doAuthorization,
    login: login
};