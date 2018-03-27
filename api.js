const express = require('express')
var router = express.Router();






router.get('/hello', (req, res) => {
  res.send('world');
})



















// documentation route, lol
// can't a developer have fun? :(
router.get('/', (req, res) => {
  console.log(router.stack)
  res.json({
    routes: router.stack.map(r => req.protocol + '://' + req.get('host') + '/api' + r.route.path)
  })
})

module.exports = router;