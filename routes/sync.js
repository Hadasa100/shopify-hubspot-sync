import express from 'express';
import { createOrUpdateHubSpotProduct } from '../lib/hubspot.js';
import {
  getShopifyProductBySKU,
  getShopifyProducts,
  getShopifyProductsByDateRange,
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
  const failures = []; 

  try {
    let { skus } = req.body;
    if (!skus) {
      return res.status(400).json({ error: 'Please provide at least one SKU.' });
    }
    // Normalize to array of SKU strings
    skus = Array.isArray(skus)
      ? skus.flatMap((sku) => sku.trim().split(/\s+/))
      : skus.trim().split(/\s+/);

    for (const sku of skus) {
      log(`🔎 Looking up product with SKU: ${sku}`);
      const shopifyProductId = await getShopifyProductBySKU(sku);
      if (!shopifyProductId) {
        log(`❌ Could not find product for SKU: ${sku}`, true);
        failures.push({ sku, reason: 'Product not found in Shopify' });
        continue;
      }
      log(`🔄 Processing SKU: ${sku}`);
      await createOrUpdateHubSpotProduct(
        { admin_graphql_api_id: shopifyProductId },
        log,
        sku,
        failures
      );
    }

    log('SKU sync complete!', true);

    // After processing all SKUs, send one email if there are failures
    if (failures.length > 0) {
      await sendFailureEmail(failures);
    }
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
  const failures = []; 

  try {
    log('🔁 Starting sync of all products...', true);
    let totalCount = 0;
    let hasNextPage = true;
    let afterCursor = null;

    while (hasNextPage) {
      const { edges, pageInfo } = await getShopifyProducts(afterCursor);
      for (const { node } of edges) {
        const sku = node.variants?.edges?.[0]?.node?.sku || "";
        log(`🔎 Processing product with SKU: ${sku || 'No SKU'}`);
        // Pass 'failures' so createOrUpdateHubSpotProduct can push errors
        await createOrUpdateHubSpotProduct(
          { ...node, admin_graphql_api_id: node.id },
          log,
          sku,
          failures
        );
        totalCount++;
      }

      hasNextPage = pageInfo.hasNextPage;
      if (hasNextPage && edges.length) {
        afterCursor = edges[edges.length - 1].cursor;
      }
    }

    log(`✅ Synced ${totalCount} products to HubSpot.`, true);

    // Send one email with all failures (if any)
    if (failures.length > 0) {
      await sendFailureEmail(failures);
    }

    res.status(200).json({
      message: `Synced ${totalCount} products to HubSpot.`,
      failedCount: failures.length,
    });
  } catch (error) {
    console.error('❌ Error syncing all products:', error);
    res.status(500).json({ error: 'An error occurred while syncing all products.' });
  }
});

/**
 * POST /sync/dates
 * Body: { startDate: "YYYY-MM-DD", endDate: "YYYY-MM-DD" }
 */
router.get('/dates', async (req, res) => {
  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  // Disable proxy buffering (if using something like Nginx)
  res.setHeader('X-Accel-Buffering', 'no');
  
  // Flush headers immediately
  res.flushHeaders();

  const sendSSE = (data) => {
    res.write(`data: ${data}\n\n`);
    if (res.flush) {
      res.flush();
    }
  };

  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) {
    sendSSE('❌ Please provide both startDate and endDate in the format YYYY-MM-DD.');
    return res.end();
  }

  sendSSE(`🔁 Starting sync of products between ${startDate} and ${endDate}...`);

  let totalCount = 0;
  let failures = [];
  let hasNextPage = true;
  let afterCursor = null;

  try {
    while (hasNextPage) {
      const { edges, pageInfo } = await getShopifyProductsByDateRange(
        startDate,
        endDate,
        afterCursor
      );

      for (const { node } of edges) {
        const sku = node.variants?.edges?.[0]?.node?.sku || "";
        sendSSE(`🔎 Processing product with SKU: ${sku || 'No SKU'}`);
        await createOrUpdateHubSpotProduct(
          { ...node, admin_graphql_api_id: node.id },
          (msg) => sendSSE(msg),
          sku,
          failures
        );
        totalCount++;
      }

      hasNextPage = pageInfo.hasNextPage;
      if (hasNextPage && edges.length) {
        afterCursor = edges[edges.length - 1].cursor;
      }
    }

    sendSSE(`✅ Synced ${totalCount} products to HubSpot.`);
    if (failures.length > 0) {
      await sendFailureEmail(failures);
    }

    // Final summary with prefix for client detection
    sendSSE('FINAL:' + JSON.stringify({
      message: `Synced ${totalCount} products to HubSpot.`,
      failedCount: failures.length,
    }));
    return res.end();
  } catch (error) {
    sendSSE(`❌ Error syncing products by date range: ${error.message}`);
    sendSSE('FINAL:' + JSON.stringify({
      error: 'An error occurred while syncing products by date range.',
    }));
    return res.end();
  }
});


export default router;
