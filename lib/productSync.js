import fetch from 'node-fetch';
import https from 'https';
import pino from 'pino';
import pLimit from 'p-limit';
import dotenv from 'dotenv';

dotenv.config();

// Logger
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

// Env var helper
function getEnv(key) {
  const val = process.env[key];
  if (!val) {
    logger.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
  return val;
}

// Config
const config = {
  shopDomain: getEnv('SHOPIFY_SHOP'),
  apiVersion: process.env.API_VERSION || '2023-10',
  adminToken: getEnv('SHOPIFY_ADMIN_API_TOKEN'),
  publications: [
    getEnv('GOOGLE_YOUTUBE_PUBLICATION_ID'),
    getEnv('SHOPIFY_GRAPHQL_APP_PUBLICATION_ID'),
    getEnv('FACEBOOK_INSTAGRAM_PUBLICATION_ID'),
    getEnv('SHOP_PUBLICATION_ID'),
  ].filter(Boolean),
  retry: {
    attempts: Number(process.env.RETRY_LIMIT) || 3,
    baseDelay: Number(process.env.RETRY_BASE_DELAY) || 500,
  },
  thresholds: {
    weight: 0.01,
    sold: ['CONSUMED', 'INVOICE'],
    dept: ['ONLINE Dept', 'CAN Dept'],
  },
  concurrency: 5,
};

// HTTP agent
const agent = new https.Agent({ keepAlive: true });

// Utilities
async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }
async function withRetry(fn, attempts = config.retry.attempts, baseDelay = config.retry.baseDelay) {
  for (let i = 0; i <= attempts; i++) {
    try { return await fn(); }
    catch (err) {
      if (i === attempts) throw err;
      const backoff = baseDelay * (i + 1);
      logger.warn(`Retry ${i + 1}/${attempts}: ${err.message}`);
      await delay(backoff);
    }
  }
}

// ShopifyClient
const BASE_URL = `https://${config.shopDomain}.myshopify.com/admin/api/${config.apiVersion}`;
const GRAPHQL_URL = `${BASE_URL}/graphql.json`;
const HEADERS = {
  'Content-Type': 'application/json',
  'X-Shopify-Access-Token': config.adminToken,
};

class ShopifyClient {
  static async rest(path, opts = {}) {
    const url = `${BASE_URL}${path}`;
    return withRetry(async () => {
      const res = await fetch(url, { agent, headers: HEADERS, ...opts });
      const text = await res.text();
      if (!res.ok) throw new Error(`REST ${res.status}: ${text}`);
      return JSON.parse(text);
    });
  }

  static async graphql(query, variables = {}) {
    return withRetry(async () => {
      const res = await fetch(GRAPHQL_URL, {
        agent,
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({ query, variables }),
      });
      const payload = await res.json();
      if (!res.ok || payload.errors) {
        const msg = payload.errors ? JSON.stringify(payload.errors) : `HTTP ${res.status}`;
        throw new Error(`GraphQL error: ${msg}`);
      }
      return payload.data;
    });
  }
}

// ProductSyncService
class ProductSyncService {
  constructor() {
    this.processing = new Set();
    this.limit = pLimit(config.concurrency);
  }

  // Fetch product data + specific metafields (including sold flag)
  async fetchProductAndMF(globalId) {
    const query = `
      query ($id: ID!) {
        product(id: $id) {
          id
          tags
          variants(first:1) { edges { node { inventoryItem { id } } } }
          erp: metafield(namespace: "fantasy", key: "erp_status") { value }
          dept: metafield(namespace: "fantasy", key: "department") { value }
          location: metafield(namespace: "fantasy", key: "location") { value }
          weight: metafield(namespace: "custom",  key: "weight") { value }
          soldFlag: metafield(namespace: "custom", key: "sold") { value }
        }
      }
    `;
    const data = await ShopifyClient.graphql(query, { id: globalId });
    const p = data.product;
    const tags = Array.isArray(p.tags)
      ? p.tags
      : (p.tags || '').split(',').map(t => t.trim());
    const rawWeight = p.weight?.value;
    const hasWeight = rawWeight != null && rawWeight !== '';
    const weight = hasWeight ? Number(rawWeight) : null;
    const mfMap = {
      'fantasy.erp_status': p.erp?.value || '',
      'fantasy.department': p.dept?.value || '',
      'fantasy.location': p.location?.value || '',
      'custom.sold': p.soldFlag?.value || 'false',
    };
    const invItemId = p.variants.edges[0].node.inventoryItem.id;
    return { tags, mfMap, invItemId, weight, hasWeight };
  }

  async resetInventory(itemId) {
    const { inventory_levels: levels = [] } = await ShopifyClient.rest(
      `/inventory_levels.json?inventory_item_ids=${itemId}`
    );
    const jobs = levels
      .filter(l => l.available > 0)
      .map(l => this.limit(() =>
        ShopifyClient.rest('/inventory_levels/adjust.json', {
          method: 'POST',
          body: JSON.stringify({ inventory_item_id: itemId, location_id: l.location_id, available_adjustment: -l.available }),
        })
      ));
    const results = await Promise.allSettled(jobs);
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    if (successCount) logger.info(`Inventory reset at ${successCount} locations`);
    return successCount > 0;
  }

  async updateTags(globalId, existingTags, tag) {
    if (existingTags.includes(tag)) return false;
    const newTags = [...existingTags, tag];
    await ShopifyClient.graphql(
      `mutation($input: ProductInput!) { productUpdate(input: $input) { userErrors { field message } } }`,
      { input: { id: globalId, tags: newTags } }
    );
    logger.info(`Tag added: ${tag}`);
    return true;
  }

  async unpublish(globalId) {
    if (!config.publications.length) return;
    const ops = config.publications.map((pub, i) =>
      `u${i}: publishableUnpublish(id: "${globalId}", input: [{ publicationId: "${pub}" }]) { userErrors { message } }`
    );
    await ShopifyClient.graphql(`mutation { ${ops.join(' ')} }`);
    logger.info('Unpublished from channels');
  }

  async archive(globalId) {
    await ShopifyClient.graphql(
      `mutation($input: ProductInput!) { productUpdate(input: $input) { userErrors { field message } } }`,
      { input: { id: globalId, status: 'ARCHIVED' } }
    );
    logger.info('Product archived');
  }

  async setSoldFlag(productId) {
    await ShopifyClient.rest(`/products/${productId}/metafields.json`, {
      method: 'POST',
      body: JSON.stringify({ metafield: { namespace: 'custom', key: 'sold', type: 'boolean', value: 'true' } }),
    });
    logger.info('custom.sold set to true');
  }

  // Only handle updates
  async handle(productGid) {
    const productId = productGid.split('/').pop();
    const globalId = productGid.startsWith('gid://') ? productGid : `gid://shopify/Product/${productId}`;
    if (this.processing.has(productId)) return;
    this.processing.add(productId);
    try {
      const { tags, mfMap, invItemId, weight, hasWeight } = await this.fetchProductAndMF(globalId);
      const status = mfMap['fantasy.erp_status'];
      const dept = mfMap['fantasy.department'];
      const location = mfMap['fantasy.location'];
      const soldFlag = mfMap['custom.sold'] === 'true';
      if (soldFlag) return;
      if (config.thresholds.sold.includes(status) || config.thresholds.dept.includes(dept)) {
        const [invChanged, tagChanged] = await Promise.all([
          this.resetInventory(invItemId),
          this.updateTags(globalId, tags, 'Sold'),
        ]);
        if (invChanged || tagChanged) await this.unpublish(globalId);
        await this.setSoldFlag(productId);
      } else if ((status === 'DELETE' || location === 'DATA - sold by the supplier' ||
        (hasWeight && weight < config.thresholds.weight)) && !tags.includes('Deleted')) {
        await this.updateTags(globalId, tags, 'Deleted');
        await this.archive(globalId);
      } else if (status === 'BOXED' && !tags.includes('Boxed')) {
        await this.updateTags(globalId, tags, 'Boxed');
        await this.archive(globalId);
      }
    } catch (err) {
      logger.error(`Error syncing ${productGid}: ${err.message}`);
      throw err;
    } finally {
      this.processing.delete(productId);
    }
  }

  // Function for create events only
  async handleCreate(productGid) {
    const productId = productGid.split('/').pop();
    const globalId = productGid.startsWith('gid://')
      ? productGid
      : `gid://shopify/Product/${productId}`;

    // 1) Publish to channels (or only online store if price > 100,000)
    const { product } = await ShopifyClient.rest(`/products/${productId}.json`);
    const price = Number(product.variants[0]?.price || 0);
    const invItemId = product.variants[0]?.inventory_item_id;
    let pubs = [...config.publications];
    if (price > 100000) {
      pubs = [getEnv('ONLINE_STORE_PUBLICATION_ID')];
    }
    if (pubs.length) {
      const ops = pubs.map((pub, i) =>
        `p${i}: publishablePublish(id:"${globalId}", input:[{publicationId:"${pub}"}]){userErrors{message}}`
      );
      await ShopifyClient.graphql(`mutation{${ops.join('')}}`);
      logger.info(`Published ${productId} to ${pubs.join(', ')}`);
    }

    // 2) Ensure default-location inventory >= 1
    const { inventory_levels: levels = [] } = await ShopifyClient.rest(
      `/inventory_levels.json?inventory_item_ids=${invItemId}`
    );
    if (levels.length && invItemId) {
      const defaultLevel = levels[0];
      const currentQty = defaultLevel.available || 0;
      const locationId = defaultLevel.location_id;

      if (locationId && !isNaN(currentQty)) {
        if (currentQty < 1) {
          const adjustment = 1 - currentQty;

          await ShopifyClient.rest('/inventory_levels/adjust.json', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              inventory_item_id: invItemId,
              location_id: locationId,
              available_adjustment: adjustment,
            }),
          });

          logger.info(`Adjusted inventory at location ${locationId} by ${adjustment} to reach 1`);
        }
      } else {
        logger.warn(`Missing or invalid locationId/currentQty for product ${productId}`);
      }
    } else {
      logger.warn(`No inventory levels or missing inventory item ID for product ${productId}`);
    }
  }

}

// Exports
export const syncService = new ProductSyncService();
export const handleProductSync = gid => syncService.handle(gid);
export const handleProductCreate = gid => syncService.handleCreate(gid);
