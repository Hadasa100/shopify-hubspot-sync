// lib/hubspot.js
import dotenv from "dotenv";
import { Client } from "@hubspot/api-client";
import { getShopifyProduct } from "./shopify.js";
dotenv.config();

const hubspotClient = new Client({ accessToken: process.env.HUBSPOT_ACCESS_TOKEN });

function extractMetafields(product) {
  // Only include metafields from allowed namespaces.
  const allowedNamespaces = new Set([
    "custom",
    "diamond",
    "gemstone",
    "jewelry",
    "loose",
    "fantasy",
  ]);
  const metafields = {};

  product.metafields?.edges?.forEach(({ node }) => {
    const { namespace, key, value } = node;
    
    // Check if namespace is allowed and value is not null/undefined/empty
    if (
      allowedNamespaces.has(namespace) &&
      value !== null &&
      value !== undefined &&
      String(value).trim() !== ""
    ) {
      // Using a double-underscore to combine namespace and key
      const metafieldKey = `${namespace}__${key}`;
      metafields[metafieldKey] = value;
    }
  });

  return metafields;
}

/**
 * Always fetches full product details from Shopify via GraphQL and then updates HubSpot.
 */
export async function createOrUpdateHubSpotProduct(product, log) {
  try {
    const fullProduct = await getShopifyProduct(product.admin_graphql_api_id);

    // Extract only allowed metafields
    const metafields = extractMetafields(fullProduct);

    // SKU from the first variant
    const sku = fullProduct.variants?.edges?.[0]?.node?.sku || "";

    log(`🔄 Processing product: ${fullProduct.title} (SKU: ${sku})`);
    // Build the properties object
    const properties = {
      name: fullProduct.title || "",
      description: fullProduct.descriptionHtml || "",
      shopify_id: fullProduct.id || "",
      hs_url: fullProduct.onlineStoreUrl || "",
      hs_images: fullProduct.images?.edges?.[0]?.node?.src || "",
      hs_sku: sku,
      price: fullProduct.variants?.edges?.[0]?.node?.price || "",
      status: fullProduct.status || "",
      ...metafields, // Only allowed metafields will be merged here
    };

    // 1) Remove empty/blank properties
    for (const [key, value] of Object.entries(properties)) {
      if (value == null || (typeof value === "string" && value.trim() === "")) {
        delete properties[key];
      }
    }

    if (!sku.trim()) {
      log(`⚠️ No SKU for product "${fullProduct.title}". Skipping HubSpot sync...`);
      return;
    }

    // 2) Search for an existing HubSpot product by SKU
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

    // 3) Update or create in HubSpot
    if (searchResponse.results.length > 0) {
      const existingId = searchResponse.results[0].id;
      await hubspotClient.crm.products.basicApi.update(existingId, { properties });
      log(`🔁 Updated: ${fullProduct.title} (SKU: ${sku})`, true);
    } else {
      await hubspotClient.crm.products.basicApi.create({ properties });
      log(`✅ Created: ${fullProduct.title} (SKU: ${sku})`, true);
    }
  } catch (error) {
    const errorDetail = error.body || error;
    // Convert error details to a string message
    const errorMessage =
      typeof errorDetail === "string" ? errorDetail : JSON.stringify(errorDetail);

    // Check for missing property errors
    let missingProperties = [];
    if (errorDetail && typeof errorDetail === "object" && Array.isArray(errorDetail.errors)) {
      errorDetail.errors.forEach((err) => {
        if (
          err.code === "PROPERTY_DOESNT_EXIST" &&
          err.context &&
          Array.isArray(err.context.propertyName)
        ) {
          missingProperties = missingProperties.concat(err.context.propertyName);
        }
      });
    }

    if (missingProperties.length > 0) {
      log(
        `❌ Failed: ${product.title} (SKU: ${product.variants?.edges?.[0]?.node?.sku || ""}) - Missing Properties: ${missingProperties.join(
          ", "
        )}. ${errorMessage}`
      );
    } else if (errorMessage.includes("already has that value")) {
      log(
        `❌ Failed: ${product.title} (SKU: ${product.variants?.edges?.[0]?.node?.sku || ""}) - SKU already in use. ${errorMessage}`
      );
    } else {
      log(
        `❌ Failed: ${product.title} (SKU: ${product.variants?.edges?.[0]?.node?.sku || ""}) - ${errorMessage}`
      );
    }
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
