const express = require('express');
const os = require("os");
const authorization = require('../authorization');

const router = express.Router();

router.get('/', function(req, res) {
  if (!authorization.verifyToken(req.cookies.token)) {
    res.render('login', {jsFile: "login.js", hostname: os.hostname()});
  } else {
    res.redirect("/");
  }

});

router.use('/token', authorization.login);

module.exports = router;
