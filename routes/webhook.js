// routes/webhook.js
import express from 'express';
import { createOrUpdateHubSpotProduct, deleteHubSpotProduct } from '../lib/hubspot.js';
import logger from '../utils/logger.js';
import { sendSummaryEmail } from '../lib/email.js';

const router = express.Router();

// Webhook for creating/updating a product
router.post('/product', express.json(), async (req, res) => {
  console.log('🚀 Webhook received for product create/update:');
  const failures = [];
  const successes = [];

  try {
    const result = await createOrUpdateHubSpotProduct(req.body, logger, req.body?.variants?.edges?.[0]?.node?.sku || 'Unknown', failures);
    if (result?.success) {
      successes.push({ sku: result.sku, title: result.title, status: result.status });
    }
    res.status(200).send('Product create/update processed.');
  } catch (error) {
    console.error('❌ Error processing product:', error);
    res.status(500).send('Error processing product webhook.');
  }

  await sendSummaryEmail(successes, failures);
});

// Webhook for deleting a product
router.post('/product/delete', express.json(), async (req, res) => {
  console.log('🚀 Webhook received for product deletion:');

  try {
    await deleteHubSpotProduct(req.body, logger);
    res.status(200).send('Product deletion processed.');
  } catch (error) {
    console.error('❌ Error processing product deletion:', error);
    res.status(500).send('Error processing product deletion webhook.');
  }
});

export default router;
