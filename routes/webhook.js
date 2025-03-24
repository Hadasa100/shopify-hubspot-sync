const express = require('express');
const router = express.Router();

router.post('/product', express.json(), async (req, res) => {
  console.log('🚀 Webhook hit!');
  console.log('📦 Raw Body:', JSON.stringify(req.body, null, 2));

  try {
    // כאן תוכלי לקרוא לפונקציה שמעדכנת את HubSpot
    // await createOrUpdateHubSpotProduct(req.body, console.log);

    res.status(200).send('Webhook received!');
  } catch (error) {
    console.error('❌ Webhook Error:', error);
    res.status(500).send('Error processing webhook');
  }
});

module.exports = router;
