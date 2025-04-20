import pLimit from 'p-limit';
import { createOrUpdateHubSpotProduct } from '../lib/hubspot.js';
import { saveSyncResult } from '../lib/historyLogger.js';


const CONCURRENCY_LIMIT = 5;
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

export async function processProducts(edges, log, failures, successes, progress) {
  const limit = pLimit(CONCURRENCY_LIMIT);

  const tasks = edges.map(({ node }, index) => {
    const sku = node.variants?.edges?.[0]?.node?.sku || '';
    return limit(async () => {
      const result = await createOrUpdateHubSpotProduct(
        { ...node, admin_graphql_api_id: node.id },
        log,
        sku,
        failures
      );

      if (result?.success) {
        successes.push({ sku: result.sku, title: result.title, status: result.status });
      }

      progress.processed++;
      log(`📦 Progress: ${progress.processed} / ${progress.total}`, true);
    });
  });

  await Promise.allSettled(tasks);
}

export async function syncBySkus(skus, res, getProductBySKU, sendSummaryEmail) {
  const log = createLogger(res);
  const failures = [];
  const successes = [];

  skus = Array.isArray(skus)
    ? skus.flatMap((sku) => sku.trim().split(/\s+/))
    : skus.trim().split(/\s+/);

  const total = skus.length;
  const progress = { processed: 0, total };

  const limit = pLimit(CONCURRENCY_LIMIT);

  const tasks = skus.map((sku) =>
    limit(async () => {
      const shopifyProductId = await getProductBySKU(sku);
      if (!shopifyProductId) {
        log(`❌ Could not find product for SKU: ${sku}`, true);
        failures.push({ sku, reason: 'Product not found in Shopify' });
      } else {
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
      progress.processed++;
      log(`📦 Progress: ${progress.processed} / ${progress.total}`, true);
    })
  );

  await Promise.allSettled(tasks);

  log('✅ SKU sync complete!', true);
  try {
    await sendSummaryEmail(successes, failures);
  } catch (error) {
    console.error('⚠️ Failed to send summary email:', error.message);
  }
  
  saveSyncResult({ type: 'sku', successes, failures });
}

export async function syncAllProducts(res, getAllProducts, sendSummaryEmail) {
  const log = createLogger(res);
  const failures = [];
  const successes = [];
  let isCancelled = false;
  let totalCount = 0;
  let processedCount = 0;

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
    totalCount += edges.length;

    await processProducts(edges, log, failures, successes, {
      processed: processedCount,
      total: totalCount,
    });

    processedCount = successes.length + failures.length;

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

  log(`✅ Synced ${processedCount} products to HubSpot.`);

try {
  await sendSummaryEmail(successes, failures);
} catch (error) {
  console.error('⚠️ Failed to send summary email:', error.message);
}

saveSyncResult({ type: 'all', successes, failures });

log('--- END LOG ---');
res.end();

return { successes, failures };
}

export async function syncProductsByDateRange(res, startDate, endDate, getByDateRange, sendSummaryEmail) {
  const log = createLogger(res);
  const failures = [];
  const successes = [];
  let totalCount = 0;
  let processedCount = 0;

  log(`🔁 Starting sync of products between ${startDate} and ${endDate}...`, true);

  let hasNextPage = true;
  let afterCursor = null;

  while (hasNextPage) {
    const { edges, pageInfo } = await getByDateRange(startDate, endDate, afterCursor);
    totalCount += edges.length;

    await processProducts(edges, log, failures, successes, {
      processed: processedCount,
      total: totalCount,
    });

    processedCount = successes.length + failures.length;

    hasNextPage = pageInfo.hasNextPage;
    if (hasNextPage && edges.length) {
      afterCursor = edges[edges.length - 1].cursor;
    }
  }

  log(`✅ Synced ${processedCount} products to HubSpot.`);

  try {
    await sendSummaryEmail(successes, failures);
  } catch (error) {
    console.error('⚠️ Failed to send summary email:', error.message);
  }
  
  saveSyncResult({ type: 'dates', successes, failures });
  
  if (!res.writableEnded) {
    res.write(
      `data: FINAL:${JSON.stringify({
        message: `Synced ${processedCount} products to HubSpot.`,
        failedCount: failures.length,
      })}\n\n`
    );
    res.end();
  }
  
  return { successes, failures };
}
