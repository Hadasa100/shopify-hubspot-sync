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

function getShopifyFields(product) {
  const sku = product.variants?.edges?.[0]?.node?.sku || "";
  const metafields = extractMetafields(product);

  return filterEmptyProperties({
    name: product.title || "",
    description: product.descriptionHtml || "",
    shopify_id: product.id || "",
    hs_url: product.onlineStoreUrl || "",
    hs_images: product.images?.edges?.[0]?.node?.src || "",
    hs_sku: sku,
    price: product.variants?.edges?.[0]?.node?.price || "",
    status: product.status || "",
    ...metafields,
  });
}

export async function createOrUpdateHubSpotProduct(inputProduct, log, productSku, failures) {
  try {
    const fullProduct = inputProduct.admin_graphql_api_id
      ? await getShopifyProduct(inputProduct.admin_graphql_api_id)
      : inputProduct;

    const sku = fullProduct.variants?.edges?.[0]?.node?.sku || "";
    if (!sku.trim()) {
      const msg = `⚠️ No SKU for product "${fullProduct.title}". Skipping HubSpot sync...`;
      log(msg, true);
      failures.push({ sku: "", reason: msg });
      return;
    }

    const properties = getShopifyFields(fullProduct);

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
      log(`🔁 Updated: ${fullProduct.title} (SKU: ${sku})`, true);
    } else {
      await hubspotClient.crm.products.basicApi.create({ properties });
      log(`✅ Created: ${fullProduct.title} (SKU: ${sku})`, true);
    }

    return { success: true, title: fullProduct.title, status: fullProduct.status, sku };
  } catch (error) {
    const parsed = parseHubSpotError(error);
    const message = parsed.message;
    log(`❌ Failed (SKU: ${productSku || "Unknown SKU"}) - ${message}`, true);
    failures.push({ sku: productSku || "Unknown SKU", reason: message });
  }
}

export async function deleteHubSpotProduct(product, log) {
  const restId = product.id;

  if (!restId) {
    const msg = `❌ No product.id found in the webhook. Cannot delete in HubSpot.`;
    log(msg, true);
    return { deleted: false, sku: '', reason: 'Missing product.id' };
  }

  // Convert REST ID to GraphQL ID
  const shopifyGID = `gid://shopify/Product/${restId}`;

  try {
    const searchResponse = await hubspotClient.crm.products.searchApi.doSearch({
      filterGroups: [
        {
          filters: [
            {
              propertyName: "shopify_id",
              operator: "EQ",
              value: shopifyGID,
            },
          ],
        },
      ],
      properties: ["hs_object_id", "hs_sku", "shopify_id", "name"],
      limit: 1,
    });

    console.log("🔍 Search Response:", searchResponse);

    if (searchResponse.results?.length > 0) {
      const result = searchResponse.results[0];
      await hubspotClient.crm.products.basicApi.archive(result.id);

      const sku = result.properties.hs_sku || '';
      const title = result.properties.name || 'Deleted Product';

      const msg = `🗑️ Deleted product from HubSpot (SKU: ${sku}, Shopify ID: ${shopifyGID})`;
      log(msg, true);
      return { deleted: true, sku, title, status: 'deleted' };
    } else {
      const msg = `⚠️ No matching HubSpot product found for deletion (Shopify ID: ${shopifyGID}).`;
      log(msg, true);
      return { deleted: false, sku: '', reason: msg };
    }
  } catch (error) {
    const msg = `❌ Error deleting product (Shopify ID: ${shopifyGID}): ${error.message || JSON.stringify(error)}`;
    log(msg, true);
    return { deleted: false, sku: '', reason: msg };
  }
}

function parseHubSpotError(error) {
  const errorDetail = error.body || error;
  let message = typeof errorDetail === "string" ? errorDetail : JSON.stringify(errorDetail);
  const missingProperties = [];

  if (errorDetail && typeof errorDetail === "object" && Array.isArray(errorDetail.errors)) {
    errorDetail.errors.forEach((err) => {
      if (err.code === "PROPERTY_DOESNT_EXIST" && Array.isArray(err.context?.propertyName)) {
        missingProperties.push(...err.context.propertyName);
      }
    });
  }

  if (missingProperties.length > 0) {
    message = `Missing Properties: ${missingProperties.join(", ")}. ${message}`;
  } else if (message.includes("already has that value")) {
    message = `SKU already in use. ${message}`;
  } else if (message.includes("null was not a valid number")) {
    const property = error.errors?.[0]?.context?.propertyName?.[0];
    message = `Property value invalid: null was not a valid number${property ? ` for ${property}` : ""}.`;
  }

  return { message };
}
