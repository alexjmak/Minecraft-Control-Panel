const express = require('express');
const authorization = require('../authorization');

const router = express.Router();

router.get('/', function(req, res, next) {
  res.render('login', { title: 'Express', jsFile: "login.js" });
});

router.use('/token', authorization.login);


module.exports = router;
