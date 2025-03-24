//sync-products.js
import { getShopifyProducts } from "./lib/shopify.js";
import { createOrUpdateHubSpotProduct } from "./lib/hubspot.js";
import { deleteProductsWithoutSku } from "./deleteProductsWithoutSku.js";

import fs from 'fs';
import path from 'path';

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const logFileName = `sync-log-${timestamp}.txt`;
const logPath = path.join('logs', logFileName); // logs/sync-log-2025-03-24T09-18-30-000Z.txt

// Ensure logs folder exists
if (!fs.existsSync('logs')) fs.mkdirSync('logs');

const logStream = fs.createWriteStream(logPath, { flags: 'a' });

export function log(message) {
  const time = new Date().toISOString();
  const fullMessage = `[${time}] ${message}`;
  logStream.write(fullMessage + '\n');
  console.log(fullMessage);
}

async function syncAllProducts() {
  let cursor = null;
  let hasNextPage = true;
  
  while (hasNextPage) {
    const data = await getShopifyProducts(cursor);
    
    for (const edge of data.edges) {
      const product = edge.node;
      await createOrUpdateHubSpotProduct(product, log); // pass log function
      cursor = edge.cursor;
    }
    
    hasNextPage = data.pageInfo.hasNextPage;
  }
  
  log("🎉 Product sync complete!");
}

async function syncSpecificProducts() {
  let cursor = null;
  let hasNextPage = true;
  
  const targetProductIds = [
    "gid://shopify/Product/9130285793579",
    "gid://shopify/Product/9130284187947",
  ];
  
  while (hasNextPage) {
    const data = await getShopifyProducts(cursor);
    
    for (const edge of data.edges) {
      const product = edge.node;
      if (targetProductIds.includes(product.id)) {
        await createOrUpdateHubSpotProduct(product, log);
      }
      cursor = edge.cursor;
    }
    
    hasNextPage = data.pageInfo.hasNextPage;
  }
  
  log("✅ Selected product sync complete.");
}

//   syncSpecificProducts().catch(console.error);


// syncAllProducts().catch(console.error);

deleteProductsWithoutSku().catch(console.error);