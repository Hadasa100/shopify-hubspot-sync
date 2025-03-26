// routes/sync.js
import express from 'express';
import { createOrUpdateHubSpotProduct } from '../lib/hubspot.js';
import { getShopifyProductBySKU, getShopifyProducts } from '../lib/shopify.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * POST /sync/skus
 * Body: { skus: ["SKU123", "SKU456"] } or { skus: "SKU123" }
 * 
 * Fetch each SKU's product ID from Shopify and then create/update in HubSpot.
 */
router.post('/skus', async (req, res) => {
  try {
    let { skus } = req.body;
    if (!skus) {
      return res.status(400).json({ error: 'Please provide at least one SKU.' });
    }

    // Convert skus to an array
    if (typeof skus === 'string') {
      skus = skus.trim().split(/\s+/);
    }
    skus = skus.flatMap(sku => sku.trim().split(/\s+/));

    // Create a helper that always calls logger with `res`
    const localLogger = (message, showFrontend = false) => {
      logger(res, message, showFrontend);
    };

    for (const sku of skus) {
      // Show this message to the user
      localLogger(`🔎 Looking up product with SKU: ${sku}`, false);

      const shopifyProductId = await getShopifyProductBySKU(sku);
      if (!shopifyProductId) {
        localLogger(`❌ Could not find product for SKU: ${sku}`, true);
        continue;
      }
      localLogger(`🔄 Processing SKU: ${sku}`, false);

      await createOrUpdateHubSpotProduct(
        { admin_graphql_api_id: shopifyProductId },
        localLogger, sku
      );
    }

    localLogger('SKU sync complete!', true);
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
 * 
 * Fetch all products from Shopify in a paginated loop and sync each one to HubSpot.
 */
router.post('/all', async (req, res) => {
  try {
    logger('🔁 Starting sync of all products...');
    let totalCount = 0;
    let hasNextPage = true;
    let afterCursor = null;

    while (hasNextPage) {
      // getShopifyProducts returns { edges, pageInfo }
      const { edges, pageInfo } = await getShopifyProducts(afterCursor);

      for (const { node } of edges) {
        // node is the entire product object with id, variants, metafields, etc.
        await createOrUpdateHubSpotProduct(
            { ...node, admin_graphql_api_id: node.id },
            logger
        );
        totalCount++;
      }

      hasNextPage = pageInfo.hasNextPage;
      if (hasNextPage) {
        afterCursor = edges[edges.length - 1].cursor;
      }
    }

    logger(`✅ Synced ${totalCount} products to HubSpot.`);
    res.status(200).json({ message: `Synced ${totalCount} products to HubSpot.` });
  } catch (error) {
    console.error('❌ Error syncing all products:', error);
    res.status(500).json({ error: 'An error occurred while syncing all products.' });
  }
});

export default router;
