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

router.post('/all', async (req, res) => {
  const log = createLogger(res);
  const failures = [];

  let isCancelled = false;

  console.log('🌐 Client connected to /sync/all');

  req.on('close', () => {
    isCancelled = true;
    console.log('❌ Client disconnected. Aborting sync.');
  });

  try {
    log('🔁 Starting sync of all products...', true);
    console.log('⏳ Fetching products from Shopify...');

    // 🟢 Keep-alive ping every 10 seconds
    const keepAliveInterval = setInterval(() => {
      if (!res.writableEnded) {
        res.write('🟢 keep-alive\n');
      }
    }, 10000);

    let totalCount = 0;
    let hasNextPage = true;
    let afterCursor = null;

    while (hasNextPage) {
      console.log(`🔄 hasNextPage: ${hasNextPage}, cursor: ${afterCursor}`);
      // if (isCancelled || res.writableEnded) {
      //   console.log('🛑 Cancelled mid-loop - breaking...');
      //   break;
      // }

      const { edges, pageInfo } = await getShopifyProducts(afterCursor);
      console.log(`📦 Fetched ${edges.length} products`);

      for (const { node } of edges) {
        // if (isCancelled || res.writableEnded) {
        //   console.log('🛑 Cancelled inside product loop - breaking...');
        //   break;
        // }

        const sku = node.variants?.edges?.[0]?.node?.sku || '';
        log(`🔎 Processing product with SKU: ${sku || 'No SKU'}`);
        console.log(`⚙️ Syncing product: ${sku}`);

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

    clearInterval(keepAliveInterval);

    if (isCancelled || res.writableEnded) {
      log('⛔ Sync cancelled by user.', true);
      log('--- END LOG ---', true);
      if (!res.writableEnded) {
        console.log('📤 Ending response after cancellation');
        return res.end();
      }
      return;
    }

    log(`✅ Synced ${totalCount} products to HubSpot.`, true);
    if (failures.length > 0) {
      await sendFailureEmail(failures);
    }

    log('--- END LOG ---', true);
    if (!res.writableEnded) {
      console.log('📤 Ending response after success');
      res.end();
    }

  } catch (error) {
    console.error('❌ Error syncing all products:', error);
    clearInterval(keepAliveInterval);
    if (!res.writableEnded) {
      log('❌ An error occurred while syncing all products.', true);
      log('--- END LOG ---', true);
      res.end();
    }
  }
});






/**
 * POST /sync/dates
 * Body: { startDate: "YYYY-MM-DD", endDate: "YYYY-MM-DD" }
 */
router.get('/dates', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const log = (msg, showFrontend = true) => {
    if (res.writableEnded) return;
    logger(res, msg, showFrontend);
  };

  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) {
    log('❌ Please provide both startDate and endDate in the format YYYY-MM-DD.');
    return res.end();
  }

  log(`🔁 Starting sync of products between ${startDate} and ${endDate}...`, true);

  let totalCount = 0;
  let failures = [];
  let hasNextPage = true;
  let afterCursor = null;

  try {
    while (hasNextPage) {
      const { edges, pageInfo } = await getShopifyProductsByDateRange(startDate, endDate, afterCursor);

      log(`📦 Fetched ${edges.length} products`);

      for (const { node } of edges) {
        const sku = node.variants?.edges?.[0]?.node?.sku || "";
        log(`🔎 Processing product with SKU: ${sku || 'No SKU'}`);
        await createOrUpdateHubSpotProduct(
          { ...node, admin_graphql_api_id: node.id },
          (msg) => log(msg),
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

    log(`✅ Synced ${totalCount} products to HubSpot.`);

    if (failures.length > 0) {
      await sendFailureEmail(failures);
    }

    log('--- END LOG ---');
    if (!res.writableEnded) {
      res.write(`data: FINAL:${JSON.stringify({ message: `Synced ${totalCount} products to HubSpot.`, failedCount: failures.length })}\n\n`);
      res.end();
    }
  } catch (error) {
    log(`❌ Error syncing products by date range: ${error.message}`);
    log('--- END LOG ---');
    res.write(`data: FINAL:${JSON.stringify({ error: 'An error occurred while syncing products by date range.' })}\n\n`);
    res.end();
  }
});



export default router;
