const express = require('express');
const router = express.Router();

router.get('/', function(req, res) {
  res.render('index', {jsFile: 'files.js'});
});

module.exports = router;
