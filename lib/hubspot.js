// lib/hubspot.js
import dotenv from "dotenv";
import { Client } from "@hubspot/api-client";
import { getShopifyProduct } from "./shopify.js";
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

/**
 * Always fetches full product details from Shopify via GraphQL and then updates HubSpot.
 */
export async function createOrUpdateHubSpotProduct(product, log) {
  try {
    // Always fetch the full product details using the product's GraphQL ID.
    const fullProduct = await getShopifyProduct(product.admin_graphql_api_id);

    // Extract metafields as key/value pairs.
    const metafields = extractMetafields(fullProduct);

    // Get the SKU from the first variant.
    const sku = fullProduct.variants?.edges?.[0]?.node?.sku || "";

    // Build the properties object for HubSpot.
    const properties = {
      name: fullProduct.title,
      description: fullProduct.descriptionHtml,
      shopify_id: fullProduct.id,
      hs_url: fullProduct.onlineStoreUrl || "",
      hs_images: fullProduct.images?.edges?.[0]?.node?.src || "",
      hs_sku: sku,
      price: fullProduct.variants?.edges?.[0]?.node?.price || "",
      ...metafields,
    };

    // Search for an existing HubSpot product using hs_sku.
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
      // Update existing product.
      const existingId = searchResponse.results[0].id;
      await hubspotClient.crm.products.basicApi.update(existingId, { properties });
      log(`🔁 Updated: ${fullProduct.title} (SKU: ${sku})`);
    } else {
      // Create a new product.
      await hubspotClient.crm.products.basicApi.create({ properties });
      log(`✅ Created: ${fullProduct.title} (SKU: ${sku})`);
    }
  } catch (error) {
    log(`❌ Failed: ${product.title} (SKU: ${product.variants?.edges?.[0]?.node?.sku || ""}) - ${JSON.stringify(error.body || error)}`);
  }
}

/**
 * (Optional) Update deleteHubSpotProduct if needed.
 */
export async function deleteHubSpotProduct(product, log) {
  // The webhook for product deletion usually includes product.id but not variants/sku.
  const shopifyId = product.id;

  if (!shopifyId) {
    log(`❌ No product.id found in the webhook. Cannot delete in HubSpot.`);
    return;
  }

  try {
    // Search for the product in HubSpot by shopify_id (which you set in createOrUpdateHubSpotProduct).
    const searchResponse = await hubspotClient.crm.products.searchApi.doSearch({
      filterGroups: [
        {
          filters: [
            {
              propertyName: "shopify_id",
              operator: "EQ",
              value: shopifyId,
            },
          ],
        },
      ],
      properties: ["hs_object_id", "hs_sku", "shopify_id"],
      limit: 1,
    });

    if (searchResponse.results && searchResponse.results.length > 0) {
      const existingId = searchResponse.results[0].id;
      await hubspotClient.crm.products.basicApi.archive(existingId);
      log(`🗑️ Deleted product from HubSpot. (Shopify ID: ${shopifyId})`);
    } else {
      log(`No matching HubSpot product found for deletion (Shopify ID: ${shopifyId}).`);
    }
  } catch (error) {
    log(`❌ Error deleting product (Shopify ID: ${shopifyId}): ${error.message || JSON.stringify(error)}`);
  }
}