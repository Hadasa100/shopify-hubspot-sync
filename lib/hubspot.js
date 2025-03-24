//lib/hubspot.js
import dotenv from "dotenv";
import { Client } from "@hubspot/api-client";
dotenv.config();

const hubspotClient = new Client({ accessToken: process.env.HUBSPOT_ACCESS_TOKEN });

function extractMetafields(product) {
  const metafields = {};
  product.metafields?.edges?.forEach(({ node }) => {
    const key = `${node.namespace}__${node.key}`;
    metafields[key] = node.value;
  });
  return metafields;
}

export async function createOrUpdateHubSpotProduct(product, log) {
  const metafields = extractMetafields(product);

  const sku = product.variants?.edges?.[0]?.node?.sku || "";

  const properties = {
    name: product.title,
    description: product.descriptionHtml,
    shopify_id: product.id,
    hs_url: product.onlineStoreUrl || "",
    hs_images: product.images?.edges?.[0]?.node?.src || "",
    hs_sku: sku,
    price: product.variants?.edges?.[0]?.node?.price || "",
    ...metafields,
  };

  try {
    // Search by hs_sku instead of shopify_id
    const searchResponse = await hubspotClient.crm.products.searchApi.doSearch({
      filterGroups: [
        {
          filters: [
            {
              propertyName: "hs_sku",
              operator: "EQ",
              value: sku,
            },
          ],
        },
      ],
      properties: ["hs_object_id"],
      limit: 1,
    });

    if (searchResponse.results.length > 0) {
      const existingId = searchResponse.results[0].id;
      await hubspotClient.crm.products.basicApi.update(existingId, { properties });
      log(`🔁 Updated: ${product.title} (SKU: ${sku})`);
    } else {
      await hubspotClient.crm.products.basicApi.create({ properties });
      log(`✅ Created: ${product.title} (SKU: ${sku})`);
    }
  } catch (error) {
    log(`❌ Failed: ${product.title} (SKU: ${sku}) - ${JSON.stringify(error.body || error)}`);
  }
}
