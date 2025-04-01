// routes/webhook.js
import express from 'express';
import { createOrUpdateHubSpotProduct, deleteHubSpotProduct } from '../lib/hubspot.js';
import logger from '../utils/logger.js';
import { sendSummaryEmail } from '../lib/email.js';

const router = express.Router();

// In-memory cache for recent webhook results
const recentResults = {
  successes: [],
  failures: [],
  timeoutId: null,
};

const DEBOUNCE_INTERVAL = 4 * 60 * 1000;

function queueSummaryEmail() {
  if (recentResults.timeoutId) clearTimeout(recentResults.timeoutId);

  recentResults.timeoutId = setTimeout(async () => {
    if (recentResults.successes.length || recentResults.failures.length) {
      console.log('📬 Sending batched webhook summary email...');
      await sendSummaryEmail(recentResults.successes, recentResults.failures);
      recentResults.successes = [];
      recentResults.failures = [];
    }
    recentResults.timeoutId = null;
  }, DEBOUNCE_INTERVAL);
}

// Webhook for creating/updating a product
router.post('/product', express.json(), async (req, res) => {
  console.log('🚀 Webhook received for product create/update');

  try {
    const failures = [];
    const result = await createOrUpdateHubSpotProduct(
      req.body,
      logger,
      req.body?.variants?.edges?.[0]?.node?.sku || 'Unknown',
      failures
    );

    if (result?.success) {
      recentResults.successes.push({ sku: result.sku, title: result.title, status: result.status });
    } else {
      recentResults.failures.push(...failures);
    }

    queueSummaryEmail();
    res.status(200).send('✅ Product create/update processed.');
  } catch (error) {
    console.error('❌ Error processing product webhook:', error);
    recentResults.failures.push({ sku: req.body?.variants?.edges?.[0]?.node?.sku || 'Unknown', reason: 'Webhook error: ' + error.message });
    queueSummaryEmail();
    res.status(500).send('❌ Error processing product webhook.');
  }
});

// Webhook for deleting a product
router.post('/product/delete', express.json(), async (req, res) => {
  console.log('🚀 Webhook received for product deletion');

  try {
    const result = await deleteHubSpotProduct(req.body, logger);

    if (!result.deleted) {
      recentResults.failures.push({ sku: result.sku || 'Unknown', reason: result.reason || 'Unknown error' });
    } else {
      recentResults.successes.push({ sku: result.sku, title: result.title, status: result.status });
    }

    queueSummaryEmail();
    res.status(200).send('✅ Product deletion processed.');
  } catch (error) {
    console.error('❌ Error processing product deletion webhook:', error);
    recentResults.failures.push({ sku: req.body?.id || 'Unknown', reason: 'Webhook deletion error: ' + error.message });
    queueSummaryEmail();
    res.status(500).send('❌ Error processing product deletion webhook.');
  }
});

export default router;