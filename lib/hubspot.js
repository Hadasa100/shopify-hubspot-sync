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
  
    const properties = {
      name: product.title,
      description: product.descriptionHtml,
      shopify_id: product.id,
      ...metafields,
    };
  
    try {
      // First, try to find existing HubSpot product by shopify_id
      const searchResponse = await hubspotClient.crm.products.searchApi.doSearch({
        filterGroups: [
          {
            filters: [
              {
                propertyName: "shopify_id",
                operator: "EQ",
                value: product.id,
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
        log(`🔁 Updated: ${product.title} (${product.id})`);
      } else {
        await hubspotClient.crm.products.basicApi.create({ properties });
        log(`✅ Created: ${product.title} (${product.id})`);
      }
    } catch (error) {
      log(`❌ Failed: ${product.title} (${product.id}) - ${JSON.stringify(error.body || error)}`);
    }
  }
  
