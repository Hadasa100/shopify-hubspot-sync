const express = require('express');
const router = express.Router();

router.post('/product', (req, res) => {
  console.log('📦 Webhook received:', req.body);
  res.status(200).send('OK');
});

module.exports = router;
