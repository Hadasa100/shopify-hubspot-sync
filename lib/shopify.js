// lib/shopify.js
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const SHOPIFY_API_URL = `https://${process.env.SHOPIFY_SHOP}.myshopify.com/admin/api/2023-10/graphql.json`;

/**
 * Generic function to perform a Shopify GraphQL query.
 */
async function shopifyGraphQL(query, variables) {
  const response = await fetch(SHOPIFY_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": process.env.SHOPIFY_ADMIN_API_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });
  const result = await response.json();
  return result;
}

/**
 * Fetch full product details by GraphQL ID.
 */
export async function getShopifyProduct(productGid) {
  const query = `
    query getProduct($id: ID!) {
      product(id: $id) {
        id
        title
        descriptionHtml
        status
        onlineStoreUrl
        images(first: 1) {
          edges {
            node { src }
          }
        }
        metafields(first: 150) {
          edges {
            node { namespace key value }
          }
        }
        variants(first: 20) {
          edges {
            node { id title sku price }
          }
        }
      }
    }
  `;
  const variables = { id: productGid };
  const result = await shopifyGraphQL(query, variables);

  if (result.errors || !result.data?.product) {
    console.error("❌ Shopify API Error:", JSON.stringify(result, null, 2));
    throw new Error("Shopify response missing expected product data.");
  }
  return result.data.product;
}

/**
 * Get multiple products with pagination.
 */
export async function getShopifyProducts(afterCursor = null) {
  const query = `
    query ($cursor: String) {
      products(first: 100, after: $cursor) {
        edges {
          cursor
          node {
            id
            title
            descriptionHtml
            onlineStoreUrl
            images(first: 1) { edges { node { src } } }
            metafields(first: 150) { edges { node { namespace key value } } }
            variants(first: 20) { edges { node { id title sku price } } }
          }
        }
        pageInfo { hasNextPage }
      }
    }
  `;
  const variables = { cursor: afterCursor };
  const result = await shopifyGraphQL(query, variables);

  if (!result.data?.products) {
    console.error("❌ Shopify API Error:", JSON.stringify(result, null, 2));
    throw new Error("Shopify response missing expected 'products' data.");
  }
  return result.data.products;
}

/**
 * Fetch a product’s GraphQL ID by SKU.
 */
export async function getShopifyProductBySKU(sku) {
  const query = `
    query getProductBySKU($query: String) {
      productVariants(first: 1, query: $query) {
        edges { node { product { id } } }
      }
    }
  `;
  const variables = { query: `sku:${sku}` };
  const result = await shopifyGraphQL(query, variables);

  if (result.errors) {
    console.error("❌ Shopify API Error:", JSON.stringify(result.errors, null, 2));
    throw new Error("Shopify error searching by SKU.");
  }

  const edges = result.data?.productVariants?.edges || [];
  return edges.length > 0 ? edges[0].node.product.id : null;
}
/**
 * Fetch products created OR updated within a date range.
 */
export async function getShopifyProductsByDateRange(startDate, endDate, afterCursor = null) {
  const formattedStart = `${startDate}T00:00:00Z`;
  const formattedEnd = `${endDate}T23:59:59Z`;

  const query = `
    query ($cursor: String, $query: String) {
      products(first: 100, after: $cursor, query: $query) {
        edges {
          cursor
          node {
            id
            title
            descriptionHtml
            onlineStoreUrl
            images(first: 1) { edges { node { src } } }
            metafields(first: 150) { edges { node { namespace key value } } }
            variants(first: 20) { edges { node { id title sku price } } }
            createdAt
            updatedAt
          }
        }
        pageInfo { hasNextPage }
      }
    }
  `;

  const queryString = `
    (created_at:>=${formattedStart} AND created_at:<=${formattedEnd})
    OR
    (updated_at:>=${formattedStart} AND updated_at:<=${formattedEnd})
  `;

  const variables = {
    cursor: afterCursor,
    query: queryString.replace(/\s+/g, ' ').trim() // ניקוי רווחים מיותרים
  };

  const result = await shopifyGraphQL(query, variables);

  if (!result.data?.products) {
    console.error("❌ Shopify API Error:", JSON.stringify(result, null, 2));
    throw new Error("Shopify response missing expected 'products' data.");
  }

  return result.data.products;
}
