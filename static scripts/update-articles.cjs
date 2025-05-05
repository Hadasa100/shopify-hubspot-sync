// update-articles.cjs
// This script updates the body of articles in a Shopify store using the Shopify GraphQL API.
// It reads a CSV file containing the article IDs and new body content, and then sends GraphQL mutations to update each article.
// Run this scrip by executing `node update-articles.js <path-to-csv>` in the terminal.
// The CSV file should have two columns: "Post GID" and "Post body".
require('dotenv').config();
const fs      = require('fs');
const path    = require('path');
const csv     = require('csv-parser');
const fetch   = require('node-fetch').default;    
const pLimit  = require('p-limit').default;      

const SHOP  = process.env.SHOPIFY_SHOP;
const TOKEN = process.env.SHOPIFY_ADMIN_API_TOKEN;
if (!SHOP || !TOKEN) {
  console.error('❌ Missing SHOPIFY_SHOP or SHOPIFY_ADMIN_API_TOKEN in .env');
  process.exit(1);
}

const API_VERSION = '2025-04';
const GRAPHQL_URL = `https://${SHOP}.myshopify.com/admin/api/${API_VERSION}/graphql.json`;

const limit = pLimit(5);


async function updateArticle(id, body) {
  const mutation = `
    mutation UpdateArticle($id: ID!, $article: ArticleUpdateInput!) {
      articleUpdate(id: $id, article: $article) {
        article { id }
        userErrors { field message }
      }
    }
  `;
  const variables = {
    id,
    article: { body }   
  };

  let response;
  try {
    response = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type':           'application/json',
        'X-Shopify-Access-Token': TOKEN,
      },
      body: JSON.stringify({ query: mutation, variables }),
    });
  } catch (networkErr) {
    console.error(`❌ Network error for ${id}:`, networkErr);
    return;
  }

  let result;
  try {
    result = await response.json();
  } catch (parseErr) {
    console.error(`❌ Failed to parse JSON for ${id}:`, parseErr);
    return;
  }

  if (Array.isArray(result.errors) && result.errors.length) {
    console.error(`❌ GraphQL errors for ${id}:`, result.errors);
    return;
  }

  if (!result.data || !result.data.articleUpdate) {
    console.error(
      `❌ Unexpected response shape for ${id}:`,
      JSON.stringify(result, null, 2)
    );
    return;
  }

  const { article, userErrors } = result.data.articleUpdate;
  if (userErrors.length) {
    console.error(
      `❌ userErrors for ${id}:`,
      userErrors.map(e => e.message).join('; ')
    );
  } else {
    console.log(`✅ Updated ${article.id}`);
  }
}

function readCSV(filePath) {
  return new Promise((resolve, reject) => {
    const updates = [];
    fs.createReadStream(filePath)
      .pipe(csv({
        mapHeaders: ({ header }) => header.replace(/^\uFEFF/, '').trim()
      }))
      .on('data', row => {
        updates.push({
          id:   row['Post GID'],
          body: row['Post body'],
        });
      })
      .on('end', () => resolve(updates))
      .on('error', reject);
  });
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('❌ Please provide a path to your CSV file.');
    process.exit(1);
  }

  console.log(`🔄 Loading updates from ${filePath}…`);

  let updates;
  try {
    updates = await readCSV(path.resolve(filePath));
  } catch (err) {
    console.error('❌ Failed to read CSV:', err);
    process.exit(1);
  }

  console.log(`🔍 Found ${updates.length} articles to update.`);

  await Promise.all(
    updates.map(u => limit(() => updateArticle(u.id, u.body)))
  );

  console.log('🎉 All updates completed.');
}

main().catch(err => {
  console.error('❌ Unexpected error in main():', err);
  process.exit(1);
});
