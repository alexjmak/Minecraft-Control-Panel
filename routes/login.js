const express = require('express');
const os = require("os");
const MobileDetect = require('mobile-detect');
const authorization = require('../authorization');
const accountManager = require('../accountManager');

const router = express.Router();

router.get('/', function(req, res) {
    let isMobile = (new MobileDetect(req.headers['user-agent'])).mobile() !== null;
    if (authorization.verifyToken(req.cookies.token)) {
        accountManager.accountExists(authorization.getTokenSubject(req), true, function(exists) {
            if (exists) res.redirect("/");
            else res.render('login', {isMobile: isMobile, hostname: os.hostname()});
        });

    } else res.render('login', {isMobile: isMobile, hostname: os.hostname()});

});

router.use('/token', authorization.login);

module.exports = router;
