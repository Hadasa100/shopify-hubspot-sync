import dotenv from "dotenv";
import { Client } from "@hubspot/api-client";
import { getShopifyProduct } from "./shopify.js";
dotenv.config();

const hubspotClient = new Client({ accessToken: process.env.HUBSPOT_ACCESS_TOKEN });

const ALLOWED_NAMESPACES = new Set([
  "custom",
  "diamond",
  "gemstone",
  "jewelry",
  "loose",
  "fantasy",
]);

export function extractMetafields(product) {
  const metafields = {};
  product.metafields?.edges?.forEach(({ node }) => {
    const { namespace, key, value } = node;
    if (
      ALLOWED_NAMESPACES.has(namespace) &&
      value != null &&
      String(value).trim() !== ""
    ) {
      metafields[`${namespace}__${key}`] = value;
    }
  });
  return metafields;
}

export function filterEmptyProperties(properties) {
  return Object.fromEntries(
    Object.entries(properties).filter(
      ([, value]) => value != null && (typeof value !== "string" || value.trim() !== "")
    )
  );
}

export function parseHubSpotError(error) {
  const errorDetail = error.body || error;
  const errorMessage =
    typeof errorDetail === "string" ? errorDetail : JSON.stringify(errorDetail);
  let missingProperties = [];

  if (errorDetail && typeof errorDetail === "object" && Array.isArray(errorDetail.errors)) {
    errorDetail.errors.forEach((err) => {
      if (err.code === "PROPERTY_DOESNT_EXIST" && err.context && Array.isArray(err.context.propertyName)) {
        missingProperties = missingProperties.concat(err.context.propertyName);
      }
    });
  }

  return { errorMessage, missingProperties };
}

export async function createOrUpdateHubSpotProduct(product, log, productSku, failures) {
  try {
    const fullProduct = await getShopifyProduct(product.admin_graphql_api_id);
    const metafields = extractMetafields(fullProduct);
    const sku = fullProduct.variants?.edges?.[0]?.node?.sku || "";
    log(`🔄 Processing product: ${fullProduct.title} (SKU: ${sku})`);

    const rawProperties = {
      name: fullProduct.title || "",
      description: fullProduct.descriptionHtml || "",
      shopify_id: fullProduct.id || "",
      hs_url: fullProduct.onlineStoreUrl || "",
      hs_images: fullProduct.images?.edges?.[0]?.node?.src || "",
      hs_sku: sku,
      price: fullProduct.variants?.edges?.[0]?.node?.price || "",
      status: fullProduct.status || "",
      ...metafields,
    };
    const properties = filterEmptyProperties(rawProperties);

    if (!sku.trim()) {
      log(`⚠️ No SKU for product "${fullProduct.title}". Skipping HubSpot sync...`);
      return;
    }

    const searchResponse = await hubspotClient.crm.products.searchApi.doSearch({
      filterGroups: [{
        filters: [{
          propertyName: "hs_sku",
          operator: "EQ",
          value: sku,
        }],
      }],
      properties: ["hs_object_id"],
      limit: 1,
    });

    if (searchResponse.results.length > 0) {
      const existingId = searchResponse.results[0].id;
      await hubspotClient.crm.products.basicApi.update(existingId, { properties });
      log(`🔁 Updated: ${fullProduct.title} (SKU: ${sku})`, true);
    } else {
      await hubspotClient.crm.products.basicApi.create({ properties });
      log(`✅ Created: ${fullProduct.title} (SKU: ${sku})`, true);
    }

    return { success: true, title: fullProduct.title, status: fullProduct.status, sku };
  } catch (error) {
    const { errorMessage, missingProperties } = parseHubSpotError(error);
    let message = errorMessage;
    if (missingProperties.length > 0) {
      message = `Missing Properties: ${missingProperties.join(", ")}. ${errorMessage}`;
      log(`❌ Failed (SKU: ${productSku || "Unknown SKU"}) - ${message}.`, false);
      log(`❌ Failed (SKU: ${productSku || "Unknown SKU"}) - Missing Properties: ${missingProperties.join(", ")}.`, true);
    } else if (errorMessage.includes("already has that value")) {
      message = `SKU already in use. ${errorMessage}`;
      log(`❌ Failed (SKU: ${productSku || "Unknown SKU"}) - ${message}`, true);
    } else if (errorMessage.includes("null was not a valid number")) {
      const propertyName = (error.errors &&
                            error.errors[0] &&
                            error.errors[0].context &&
                            error.errors[0].context.propertyName &&
                            error.errors[0].context.propertyName[0]) || "";
      log(`❌ Failed (SKU: ${productSku || "Unknown SKU"}) - Property values were not valid: null was not a valid number${propertyName ? " for " + propertyName : ""}.`, true);
    } else {
      log(`❌ Failed (SKU: ${productSku || "Unknown SKU"}) - ${errorMessage}`, true);
    }
    failures.push({ sku: productSku || "Unknown SKU", reason: message });
  }
}

export async function deleteHubSpotProduct(product, log) {
  const shopifyId = product.id;
  if (!shopifyId) {
    log(`❌ No product.id found in the webhook. Cannot delete in HubSpot.`);
    return { deleted: false, sku: '', reason: 'Missing product.id' };
  }

  try {
    const searchResponse = await hubspotClient.crm.products.searchApi.doSearch({
      filterGroups: [{
        filters: [{
          propertyName: "shopify_id",
          operator: "EQ",
          value: shopifyId,
        }],
      }],
      properties: ["hs_object_id", "hs_sku", "shopify_id"],
      limit: 1,
    });

    if (searchResponse.results?.length > 0) {
      const result = searchResponse.results[0];
      const existingId = result.id;
      const sku = result.properties.hs_sku || '';
      await hubspotClient.crm.products.basicApi.archive(existingId);
      log(`🗑️ Deleted product from HubSpot. (Shopify ID: ${shopifyId})`);
      return { deleted: true, sku, title: 'Deleted Product', status: 'deleted' };
    } else {
      log(`No matching HubSpot product found for deletion (Shopify ID: ${shopifyId}).`);
      return { deleted: false, sku: '', reason: 'No matching product found' };
    }
  } catch (error) {
    log(`❌ Error deleting product (Shopify ID: ${shopifyId}): ${error.message || JSON.stringify(error)}`);
    return { deleted: false, sku: '', reason: error.message || 'Unknown error' };
  }
}
