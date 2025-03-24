// routes/webhook.js
import express from 'express';
import { createOrUpdateHubSpotProduct, deleteHubSpotProduct } from '../lib/hubspot.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Webhook for creating/updating a product
router.post('/product', express.json(), async (req, res) => {
  console.log('🚀 Webhook received for product create/update:');
  console.log(JSON.stringify(req.body, null, 2));

  try {
    await createOrUpdateHubSpotProduct(req.body, logger);
    res.status(200).send('Product create/update processed.');
  } catch (error) {
    console.error('❌ Error processing product:', error);
    res.status(500).send('Error processing product webhook.');
  }
});

// Webhook for deleting a product
router.post('/product/delete', express.json(), async (req, res) => {
  console.log('🚀 Webhook received for product deletion:');
  console.log(JSON.stringify(req.body, null, 2));

  try {
    await deleteHubSpotProduct(req.body, logger);
    res.status(200).send('Product deletion processed.');
  } catch (error) {
    console.error('❌ Error processing product deletion:', error);
    res.status(500).send('Error processing product deletion webhook.');
  }
});

export default router;
