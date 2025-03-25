// lib/shopify.js
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const SHOPIFY_API_URL = `https://${process.env.SHOPIFY_SHOP}.myshopify.com/admin/api/2023-10/graphql.json`;

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
            node {
              src
            }
          }
        }
        metafields(first: 150) {
          edges {
            node {
              namespace
              key
              value
            }
          }
        }
        variants(first: 20) {
          edges {
            node {
              id
              title
              sku
              price
            }
          }
        }
      }
    }
  `;
  const variables = { id: productGid };

  const response = await fetch(SHOPIFY_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": process.env.SHOPIFY_ADMIN_API_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });

  const result = await response.json();

  if (result.errors || !result.data || !result.data.product) {
    console.error("❌ Shopify API Error:", JSON.stringify(result, null, 2));
    throw new Error("Shopify response missing expected product data.");
  }

  return result.data.product;
}

/**
 * (Optional) Existing function to get multiple products.
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
            images(first: 1) {
              edges {
                node {
                  src
                }
              }
            }
            metafields(first: 150) {
              edges {
                node {
                  namespace
                  key
                  value
                }
              }
            }
            variants(first: 20) {
              edges {
                node {
                  id
                  title
                  sku
                  price
                }
              }
            }
          }
        }
        pageInfo {
          hasNextPage
        }
      }
    }
  `;

  const response = await fetch(SHOPIFY_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": process.env.SHOPIFY_ADMIN_API_TOKEN,
    },
    body: JSON.stringify({
      query,
      variables: { cursor: afterCursor },
    }),
  });

  const result = await response.json();

  if (!result.data || !result.data.products) {
    console.error("❌ Shopify API Error:", JSON.stringify(result, null, 2));
    throw new Error("Shopify response missing expected 'products' data.");
  }

  return result.data.products;
}

/**
 * Fetch a product’s GraphQL ID by SKU (via variant lookup).
 * Returns null if no product is found for that SKU.
 */
export async function getShopifyProductBySKU(sku) {
  const query = `
    query getProductBySKU($query: String) {
      productVariants(first: 1, query: $query) {
        edges {
          node {
            product {
              id
            }
          }
        }
      }
    }
  `;

  // The "query" parameter can be "sku:SKU_VALUE"
  const variables = {
    query: `sku:${sku}`,
  };

  const response = await fetch(SHOPIFY_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": process.env.SHOPIFY_ADMIN_API_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });

  const result = await response.json();
  if (result.errors) {
    console.error("❌ Shopify API Error:", JSON.stringify(result.errors, null, 2));
    throw new Error("Shopify error searching by SKU.");
  }

  const edges = result?.data?.productVariants?.edges || [];
  if (edges.length > 0) {
    // Return the product ID of the first matching variant
    return edges[0].node.product.id;
  }

  return null;
}