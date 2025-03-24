// lib/hubspot.js
import dotenv from 'dotenv';
import { Client } from '@hubspot/api-client';

dotenv.config();
const hubspotClient = new Client({ accessToken: process.env.HUBSPOT_ACCESS_TOKEN });

/**
 * Extract metafields from the product and map them to a flat structure.
 */
function extractMetafields(product) {
  const metafields = {};
  product.metafields?.edges?.forEach(({ node }) => {
    const key = `${node.namespace}__${node.key}`;
    metafields[key] = node.value;
  });
  return metafields;
}

/**
 * Function to create or update a product in HubSpot.
 * Fields saved include: name, description, shopify_id, hs_url, hs_images, hs_sku, price, and additional metafields.
 */
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
    // Search for an existing product in HubSpot using hs_sku
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

    if (searchResponse.results && searchResponse.results.length > 0) {
      // Update existing product
      const existingId = searchResponse.results[0].id;
      await hubspotClient.crm.products.basicApi.update(existingId, { properties });
      log(`🔁 Updated: ${product.title} (SKU: ${sku})`);
    } else {
      // Create a new product
      await hubspotClient.crm.products.basicApi.create({ properties });
      log(`✅ Created: ${product.title} (SKU: ${sku})`);
    }
  } catch (error) {
    log(`❌ Error syncing product ${product.title} (SKU: ${sku}): ${error.message || JSON.stringify(error)}`);
  }
}

/**
 * Function to delete a product in HubSpot.
 * It searches for the product using hs_sku and, if found, archives (deletes) it.
 */
export async function deleteHubSpotProduct(product, log) {
  const sku = product.variants?.edges?.[0]?.node?.sku || "";
  if (!sku) {
    log(`SKU not available for deletion for product with id: ${product.id}`);
    return;
  }

  try {
    // Search for the product in HubSpot using hs_sku
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

    if (searchResponse.results && searchResponse.results.length > 0) {
      const existingId = searchResponse.results[0].id;
      await hubspotClient.crm.products.basicApi.archive(existingId);
      log(`🗑️ Deleted: ${product.title} (SKU: ${sku})`);
    } else {
      log(`Product not found for deletion (SKU: ${sku})`);
    }
  } catch (error) {
    log(`❌ Error deleting product ${product.title} (SKU: ${sku}): ${error.message || JSON.stringify(error)}`);
  }
}
