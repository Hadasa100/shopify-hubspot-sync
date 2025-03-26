// routes/sync.js
import express from 'express';
import { createOrUpdateHubSpotProduct } from '../lib/hubspot.js';
import {
  getShopifyProductBySKU,
  getShopifyProducts,
  getShopifyProductsByDateRange
} from '../lib/shopify.js';
import logger from '../utils/logger.js';
import { sendFailureEmail } from '../lib/email.js';

const router = express.Router();

/**
 * Helper to send log messages to both console and response.
 */
const createLogger = (res) => (message, showFrontend = false) => {
  logger(res, message, showFrontend);
};

/**
 * POST /sync/skus
 * Body: { skus: ["SKU123", "SKU456"] } or { skus: "SKU123" }
 */
router.post('/skus', async (req, res) => {
  const log = createLogger(res);
  try {
    let { skus } = req.body;
    if (!skus) {
      return res.status(400).json({ error: 'Please provide at least one SKU.' });
    }
    // Normalize to array of SKU strings
    skus = Array.isArray(skus)
      ? skus.flatMap(sku => sku.trim().split(/\s+/))
      : skus.trim().split(/\s+/);

    for (const sku of skus) {
      log(`🔎 Looking up product with SKU: ${sku}`);
      const shopifyProductId = await getShopifyProductBySKU(sku);
      if (!shopifyProductId) {
        log(`❌ Could not find product for SKU: ${sku}`, true);
        continue;
      }
      log(`🔄 Processing SKU: ${sku}`);
      await createOrUpdateHubSpotProduct({ admin_graphql_api_id: shopifyProductId }, log, sku);
    }
    log('SKU sync complete!', true);
    res.end();
  } catch (error) {
    console.error('❌ Error syncing SKUs:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'An error occurred while syncing SKUs.' });
    } else {
      res.write('❌ An error occurred while syncing SKUs.');
      res.end();
    }
  }
});

/**
 * POST /sync/all
 * Fetch all products from Shopify and sync each to HubSpot.
 */
router.post('/all', async (req, res) => {
  const log = createLogger(res);
  try {
    log('🔁 Starting sync of all products...', true);
    let totalCount = 0;
    let hasNextPage = true;
    let afterCursor = null;

    while (hasNextPage) {
      const { edges, pageInfo } = await getShopifyProducts(afterCursor);
      for (const { node } of edges) {
        await createOrUpdateHubSpotProduct(
          { ...node, admin_graphql_api_id: node.id },
          log,
          node.sku
        );
        totalCount++;
      }
      hasNextPage = pageInfo.hasNextPage;
      if (hasNextPage && edges.length) {
        afterCursor = edges[edges.length - 1].cursor;
      }
    }
    log(`✅ Synced ${totalCount} products to HubSpot.`, true);
    res.status(200).json({ message: `Synced ${totalCount} products to HubSpot.` });
  } catch (error) {
    console.error('❌ Error syncing all products:', error);
    res.status(500).json({ error: 'An error occurred while syncing all products.' });
  }
});

/**
 * POST /sync/dates
 * Sync products created/updated between startDate and endDate.
 */
router.post('/dates', async (req, res) => {
  const log = createLogger(res);
  try {
    const { startDate, endDate } = req.body;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Please provide both startDate and endDate in the format YYYY-MM-DD.' });
    }
    log(`🔁 Starting sync of products between ${startDate} and ${endDate}...`, false);
    let totalCount = 0;
    let hasNextPage = true;
    let afterCursor = null;
    const syncErrors = [];

    while (hasNextPage) {
      const { edges, pageInfo } = await getShopifyProductsByDateRange(startDate, endDate, afterCursor);
      for (const { node } of edges) {
        try {
          await createOrUpdateHubSpotProduct(
            { ...node, admin_graphql_api_id: node.id },
            log,
            node.sku
          );
          totalCount++;
        } catch (error) {
          const errorMsg = `Failed to sync product with SKU ${node.sku}: ${error.message}`;
          log(`❌ ${errorMsg}`);
          syncErrors.push(errorMsg);
        }
      }
      hasNextPage = pageInfo.hasNextPage;
      if (hasNextPage && edges.length) {
        afterCursor = edges[edges.length - 1].cursor;
      }
    }
    log(`✅ Synced ${totalCount} products to HubSpot.`, true);
    if (syncErrors.length > 0) {
      await sendFailureEmail(syncErrors.map(err => ({ sku: 'Unknown SKU', reason: err })));
      log(`📧 Sent error email with details of ${syncErrors.length} failed sync(s).`);
    }
    res.status(200).json({ message: `Synced ${totalCount} products to HubSpot.`, failedSyncs: syncErrors.length });
  } catch (error) {
    console.error('❌ Error syncing products by date range:', error);
    res.status(500).json({ error: 'An error occurred while syncing products by date range.' });
  }
});

export default router;
