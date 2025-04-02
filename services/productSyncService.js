import { createOrUpdateHubSpotProduct } from '../lib/hubspot.js';

/**
 * Logs a message to the frontend stream and server logs.
 */
const createLogger = (res) => (message, showFrontend = false) => {
  const formatted = message.replace(/\n/g, ' ');
  console.log(formatted);
  if (!res.writableEnded) {
    try {
      res.write(`data: ${formatted}\n\n`);
    } catch (e) {
      console.warn('⚠️ Failed to write SSE log:', e.message);
    }
  }
};

/**
 * Processes a list of Shopify product edges.
 */
export async function processProducts(edges, log, failures, successes) {
  for (const { node } of edges) {
    const sku = node.variants?.edges?.[0]?.node?.sku || '';

    const result = await createOrUpdateHubSpotProduct(
      { ...node, admin_graphql_api_id: node.id },
      log,
      sku,
      failures
    );

    if (result?.success) {
      successes.push({ sku: result.sku, title: result.title, status: result.status });
    }
  }
}

/**
 * Sync products by SKU list.
 */
export async function syncBySkus(skus, res, getProductBySKU, sendSummaryEmail) {
  const log = createLogger(res);
  const failures = [];
  const successes = [];

  skus = Array.isArray(skus)
    ? skus.flatMap((sku) => sku.trim().split(/\s+/))
    : skus.trim().split(/\s+/);

  for (const sku of skus) {
    const shopifyProductId = await getProductBySKU(sku);
    if (!shopifyProductId) {
      log(`❌ Could not find product for SKU: ${sku}`, true);
      failures.push({ sku, reason: 'Product not found in Shopify' });
      continue;
    }

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

  log('✅ SKU sync complete!', true);
  await sendSummaryEmail(successes, failures);
}

/**
 * Sync all Shopify products with pagination.
 */
export async function syncAllProducts(res, getAllProducts, sendSummaryEmail) {
    const log = createLogger(res);
    const failures = [];
    const successes = [];
    let isCancelled = false;
    let totalCount = 0;
  
    res.on('close', () => {
      if (!res.writableEnded) {
        isCancelled = true;
        console.log('❌ Client disconnected. Aborting sync.');
      } else {
        console.log('✅ Client closed connection after completion.');
      }
    });
  
    log('🔁 Starting sync of all products...');
  
    let hasNextPage = true;
    let afterCursor = null;
  
    while (hasNextPage) {
      const { edges, pageInfo } = await getAllProducts(afterCursor);
      await processProducts(edges, log, failures, successes);
      totalCount += edges.length;
  
      hasNextPage = pageInfo.hasNextPage;
      if (hasNextPage && edges.length) {
        afterCursor = edges[edges.length - 1].cursor;
      }
  
      if (isCancelled || res.writableEnded) {
        log('⛔ Sync cancelled by user.');
        log('--- END LOG ---');
        return res.end();
      }
    }
  
    log(`✅ Synced ${totalCount} products to HubSpot.`);
    await sendSummaryEmail(successes, failures);
    log('--- END LOG ---');
    res.end();
  }
  
  
  /**
   * Sync products by date range.
   */
  export async function syncProductsByDateRange(res, startDate, endDate, getByDateRange, sendSummaryEmail) {
    const log = createLogger(res);
    const failures = [];
    const successes = [];
    let totalCount = 0;
  
    log(`🔁 Starting sync of products between ${startDate} and ${endDate}...`, true);
  
    let hasNextPage = true;
    let afterCursor = null;
  
    while (hasNextPage) {
      const { edges, pageInfo } = await getByDateRange(startDate, endDate, afterCursor);
      await processProducts(edges, log, failures, successes);
      totalCount += edges.length;
  
      hasNextPage = pageInfo.hasNextPage;
      if (hasNextPage && edges.length) {
        afterCursor = edges[edges.length - 1].cursor;
      }
    }
  
    log(`✅ Synced ${totalCount} products to HubSpot.`);
    await sendSummaryEmail(successes, failures);
  
    if (!res.writableEnded) {
      res.write(`data: FINAL:${JSON.stringify({ message: `Synced ${totalCount} products to HubSpot.`, failedCount: failures.length })}\n\n`);
      res.end();
    }
  }
  