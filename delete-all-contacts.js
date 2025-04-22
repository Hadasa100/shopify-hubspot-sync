import { Client } from "@hubspot/api-client";
import dotenv from "dotenv";
import pLimit from "p-limit";

dotenv.config();

const hubspot = new Client({ accessToken: process.env.HUBSPOT_ACCESS_TOKEN });

const PAGE_SIZE   = 100;  // Max contacts per archive request
const CONCURRENCY = 3;    // Number of concurrent archive requests
const DRY         = process.env.DRY === "true"; // Dry run flag

/**
 * Retrieve every contact ID in the portal using cursor‑based pagination.
 */
async function listAllContactIds() {
  const ids = [];
  let after;
  do {
    const page = await hubspot.crm.contacts.basicApi.getPage(PAGE_SIZE, after);
    ids.push(...page.results.map(c => c.id));
    after = page.paging?.next?.after;
  } while (after);
  return ids;
}

/**
 * Archive (soft‑delete) one batch of contacts.
 * A batch is an array of IDs, max length = PAGE_SIZE.
 */
async function archiveBatch(batch) {
  if (DRY) {
    console.log(`[DRY‑RUN] Would archive ${batch.length} contacts`);
    return;
  }
  await hubspot.crm.contacts.batchApi.archive({
    inputs: batch.map(id => ({ id }))
  });
}

(async () => {
  try {
    const ids = await listAllContactIds();
    console.log(`Found ${ids.length} contacts to archive`);

    const limit = pLimit(CONCURRENCY);
    let processed = 0;

    await Promise.all(
      ids
        .reduce((chunks, id, idx) => {
          const i = Math.floor(idx / PAGE_SIZE);
          (chunks[i] ||= []).push(id);
          return chunks;
        }, [])
        .map(chunk =>
          limit(async () => {
            await archiveBatch(chunk);
            processed += chunk.length;
            console.log(`Archived ${processed}/${ids.length}`);
          })
        )
    );

    console.log("✔️  All contacts have been archived");
  } catch (err) {
    console.error("Error:", JSON.stringify(err.response?.body || err, null, 2));
  }
})();