// delete-all-products.js
import { Client } from "@hubspot/api-client";
import dotenv from "dotenv";
import pLimit from "p-limit";

dotenv.config();

const hubspot = new Client({ accessToken: process.env.HUBSPOT_ACCESS_TOKEN });

// how many products to fetch per page / archive per batch
const PAGE_SIZE   = 100;
// how many batches to archive in parallel
const CONCURRENCY = 3;
// set DRY=true in your env to only log what would happen
const DRY = process.env.DRY === "true";

/**
 * Fetch every product ID in the portal via cursor-based pagination
 */
async function listAllProductIds() {
  const ids = [];
  let after;
  do {
    const page = await hubspot.crm.products.basicApi.getPage(PAGE_SIZE, after);
    ids.push(...page.results.map(p => p.id));
    after = page.paging?.next?.after;
  } while (after);
  return ids;
}

/**
 * Archive (soft-delete) one batch of products.
 * If DRY, just logs instead of calling the API.
 */
async function archiveProductBatch(batch) {
  if (DRY) {
    console.log(`[DRY-RUN] Would archive ${batch.length} products:`, batch);
    return;
  }
  await hubspot.crm.products.batchApi.archive({
    inputs: batch.map(id => ({ id }))
  });
}

(async () => {
  try {
    const ids = await listAllProductIds();
    console.log(`Found ${ids.length} products to archive`);

    const limit = pLimit(CONCURRENCY);
    let processed = 0;

    // split into chunks of PAGE_SIZE and run in parallel
    await Promise.all(
      ids.reduce((chunks, id, idx) => {
        const batchIndex = Math.floor(idx / PAGE_SIZE);
        (chunks[batchIndex] ||= []).push(id);
        return chunks;
      }, [])
      .map(batchIds =>
        limit(async () => {
          await archiveProductBatch(batchIds);
          processed += batchIds.length;
          console.log(`Archived ${processed}/${ids.length}`);
        })
      )
    );

    console.log("✔️  All products have been archived");
  } catch (err) {
    console.error("Error archiving products:", err.response?.body || err);
  }
})();
