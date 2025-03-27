import express from 'express';
import { createOrUpdateHubSpotProduct } from '../lib/hubspot.js';
import {
  getShopifyProductBySKU,
  getShopifyProducts,
  getShopifyProductsByDateRange,
} from '../lib/shopify.js';
import logger from '../utils/logger.js';
import { sendSummaryEmail } from '../lib/email.js';

const router = express.Router();

const createLogger = (res) => (message, showFrontend = false) => {
  logger(res, message, showFrontend);
};

router.post('/skus', async (req, res) => {
  const log = createLogger(res);
  const failures = [];
  const successes = [];

  try {
    let { skus } = req.body;
    if (!skus) {
      return res.status(400).json({ error: 'Please provide at least one SKU.' });
    }
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
      const result = await createOrUpdateHubSpotProduct(
        { admin_graphql_api_id: shopifyProductId },
        log,
        sku,
        failures
      );
      if (result?.success) {
        successes.push({ sku: result.sku, title: result.title, status: result.status });
      }
    }

    log('SKU sync complete!', true);
    await sendSummaryEmail(successes, failures);
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
  const successes = [];
  let isCancelled = false;

  console.log('🌐 Client connected to /sync/all');

  req.on('close', () => {
    isCancelled = true;
    console.log('❌ Client disconnected. Aborting sync.');
  });

  try {
    log('🔁 Starting sync of all products...', true);
    const keepAliveInterval = setInterval(() => {
      if (!res.writableEnded) {
        res.write('🟢 keep-alive\n');
      }
    }, 10000);

    let totalCount = 0;
    let hasNextPage = true;
    let afterCursor = null;

    while (hasNextPage) {
      const { edges, pageInfo } = await getShopifyProducts(afterCursor);

      for (const { node } of edges) {
        const sku = node.variants?.edges?.[0]?.node?.sku || '';
        log(`🔎 Processing product with SKU: ${sku || 'No SKU'}`);

        const result = await createOrUpdateHubSpotProduct(
          { ...node, admin_graphql_api_id: node.id },
          log,
          sku,
          failures
        );

        if (result?.success) {
          successes.push({ sku: result.sku, title: result.title, status: result.status });
        }

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
      return res.end();
    }

    log(`✅ Synced ${totalCount} products to HubSpot.`, true);
    await sendSummaryEmail(successes, failures);
    log('--- END LOG ---', true);
    res.end();
  } catch (error) {
    console.error('❌ Error syncing all products:', error);
    res.end();
  }
});

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
  const failures = [];
  const successes = [];
  let hasNextPage = true;
  let afterCursor = null;

  try {
    while (hasNextPage) {
      const { edges, pageInfo } = await getShopifyProductsByDateRange(startDate, endDate, afterCursor);

      for (const { node } of edges) {
        const sku = node.variants?.edges?.[0]?.node?.sku || "";
        log(`🔎 Processing product with SKU: ${sku || 'No SKU'}`);
        const result = await createOrUpdateHubSpotProduct(
          { ...node, admin_graphql_api_id: node.id },
          (msg) => log(msg),
          sku,
          failures
        );
        if (result?.success) {
          successes.push({ sku: result.sku, title: result.title, status: result.status });
        }
        totalCount++;
      }

      hasNextPage = pageInfo.hasNextPage;
      if (hasNextPage && edges.length) {
        afterCursor = edges[edges.length - 1].cursor;
      }
    }

    log(`✅ Synced ${totalCount} products to HubSpot.`);
    await sendSummaryEmail(successes, failures);
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
