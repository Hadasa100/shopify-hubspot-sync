import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

// Constants and configuration
const RETRY_LIMIT = 3;
const RETRY_BASE_DELAY = 500; // ms
const soldConditions = ['CONSUMED', 'INVOICE'];
const deptConditions = ['ONLINE Dept', 'CAN Dept'];

// Validate required environment variables
const requiredVars = [
  'SHOPIFY_SHOP',
  'SHOPIFY_ADMIN_API_TOKEN',
  'GOOGLE_YOUTUBE_PUBLICATION_ID',
  'SHOPIFY_GRAPHQL_APP_PUBLICATION_ID',
  'FACEBOOK_INSTAGRAM_PUBLICATION_ID',
  'SHOP_PUBLICATION_ID',
];
for (const name of requiredVars) {
  if (!process.env[name]) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
}

const SHOP_DOMAIN = process.env.SHOPIFY_SHOP;
const API_VERSION = process.env.API_VERSION || '2023-10';
const BASE_URL = `https://${SHOP_DOMAIN}.myshopify.com/admin/api/${API_VERSION}`;
const GRAPHQL_URL = `${BASE_URL}/graphql.json`;

const HEADERS = {
  'Content-Type': 'application/json',
  'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_API_TOKEN,
};

// Track in-progress products to avoid loops
const processing = new Set();

// Utility: delay
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Utility: retry wrapper
async function withRetry(fn, retries = RETRY_LIMIT, delayMs = RETRY_BASE_DELAY) {
  let attempt = 0;
  while (attempt <= retries) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      if (attempt > retries) throw err;
      const backoff = delayMs * attempt;
      console.warn(`Retry ${attempt}/${retries} after error: ${err.message}`);
      await delay(backoff);
    }
  }
}

/**
 * Generic Shopify request with retry logic for rate limits.
 */
async function shopifyRequest(endpointOrQuery, options = {}, isGraphQL = false) {
  const url = isGraphQL ? GRAPHQL_URL : `${BASE_URL}${endpointOrQuery}`;
  const fetchOpts = isGraphQL
    ? { method: 'POST', headers: HEADERS, body: JSON.stringify({ query: endpointOrQuery, variables: options }) }
    : { headers: HEADERS, ...options };

  return withRetry(async () => {
    const res = await fetch(url, fetchOpts);
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`${isGraphQL ? 'GraphQL' : 'REST'} failed (${res.status}): ${text}`);
    }
    const payload = JSON.parse(text);
    if (isGraphQL && payload.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(payload.errors)}`);
    }
    return isGraphQL ? payload.data : payload;
  });
}

/**
 * Adjust inventory to zero across locations in parallel.
 */
async function adjustInventory(inventoryItemId) {
  const data = await shopifyRequest(
    `/inventory_levels.json?inventory_item_ids=${inventoryItemId}`
  );
  const levels = data.inventory_levels || [];

  const tasks = levels.map(({ location_id: loc, available = 0 }) => {
    if (available > 0) {
      console.log(`🛠️ Resetting inventory at ${loc}`);
      return shopifyRequest(
        '/inventory_levels/adjust.json',
        {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify({ inventory_item_id: inventoryItemId, location_id: loc, available_adjustment: -available }),
        }
      );
    }
    return Promise.resolve();
  });

  await Promise.all(tasks);
  return tasks.some(task => task instanceof Promise);
}

/**
 * Add ‘Sold’ tag if missing.
 */
async function ensureSoldTag(globalId, tags) {
  if (tags.includes('Sold')) return false;
  const newTags = [...tags, 'Sold'];
  const mutation = `
    mutation updateTags($input: ProductInput!) {
      productUpdate(input: $input) { userErrors { field message } }
    }
  `;
  await shopifyRequest(mutation, { input: { id: globalId, tags: newTags } }, true);
  console.log('✅ Added Sold tag');
  return true;
}

/**
 * Bulk unpublish from all channels in one GraphQL call.
 */
async function bulkUnpublish(globalId, publicationIds) {
  const fields = publicationIds
    .filter(id => id)
    .map((pub, i) => `unpub${i}: publishableUnpublish(id: \"${globalId}\", input:[{publicationId: \"${pub}\"}]) { userErrors { message } }`)
    .join('\n');
  if (!fields) return;

  const mutation = `mutation {${fields}}`;
  const data = await shopifyRequest(mutation, {}, true);

  Object.keys(data).forEach(key => {
    const errs = data[key].userErrors;
    if (errs.length) console.error(`❌ ${key} errors:`, errs);
    else console.log(`✅ ${key} succeeded`);
  });
}

/**
 * Main sync function with improved resilience and performance.
 */
export async function handleProductSync(productGid) {
  const productId = productGid.split('/').pop();
  const globalId = productGid.startsWith('gid://')
    ? productGid
    : `gid://shopify/Product/${productId}`;

  if (processing.has(productId)) {
    console.log(`🛑 ${productId} already in progress`);
    return;
  }
  processing.add(productId);

  try {
    // Fetch product & metafields
    const { product } = await shopifyRequest(`/products/${productId}.json`);
    const mfData = await shopifyRequest(`/products/${productId}/metafields.json`);
    const mfMap = Object.fromEntries(
      mfData.metafields.map(m => [`${m.namespace}.${m.key}`, m.value])
    );

    // Check sold
    const status = mfMap['fantasy.erp_status'];
    const dept = mfMap['fantasy.department'];
    if (!soldConditions.includes(status) && !deptConditions.includes(dept)) {
      console.log('ℹ️ Not sold; skip');
      return;
    }

    // Batch operations
    const variant = product.variants[0];
    if (!variant) throw new Error('No variant');
    const tasks = [];
    tasks.push(adjustInventory(variant.inventory_item_id));
    const existingTags = (product.tags || '').split(',').map(t => t.trim());
    tasks.push(ensureSoldTag(globalId, existingTags));

    const [invChanged, tagChanged] = await Promise.all(tasks);

    // Publications
    if (invChanged || tagChanged) {
      await bulkUnpublish(globalId, [
        process.env.GOOGLE_YOUTUBE_PUBLICATION_ID,
        process.env.SHOPIFY_GRAPHQL_APP_PUBLICATION_ID,
        process.env.FACEBOOK_INSTAGRAM_PUBLICATION_ID,
        process.env.SHOP_PUBLICATION_ID,
      ]);
    }

    console.log('🎉 syncGraph done');
  } catch (err) {
    console.error('❌ syncGraph error:', err.message);
    throw err;
  } finally {
    processing.delete(productId);
  }
}
