import { getShopifyProducts } from "./lib/shopify.js";
import { createOrUpdateHubSpotProduct } from "./lib/hubspot.js";
import fs from "fs";

const logStream = fs.createWriteStream("sync-log.txt", { flags: "a" });

function log(message) {
  const time = new Date().toISOString();
  logStream.write(`[${time}] ${message}\n`);
  console.log(message);
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
  

syncAllProducts().catch(console.error);
