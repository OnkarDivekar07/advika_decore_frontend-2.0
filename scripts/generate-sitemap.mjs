#!/usr/bin/env node
// scripts/generate-sitemap.mjs
//
// Why this is a script, not a static public/sitemap.xml checked into the
// repo: product URLs come from the backend's product catalog, which this
// frontend build has no visibility into at `vite build` time — the
// catalog changes independently of any frontend deploy. So this fetches
// the *real*, current product list from the same public `/api/products`
// endpoint the storefront itself uses (see src/services/productsService.
// fetchProducts) and writes an XML sitemap from that live data. Run it
// as its own step before/alongside a deploy — NOT wired into the default
// `npm run build`/`vite build`, since that would make every local dev
// build silently depend on a reachable backend.
//
// Usage:
//   VITE_SITE_URL=https://your-real-domain.com \
//   VITE_API_URL=https://your-api-domain.com \
//   node scripts/generate-sitemap.mjs
//
// Also rewrites the `Sitemap:` line in public/robots.txt to the same
// absolute site URL (robots.txt requires an absolute URL there — see the
// comment in that file), so both stay in sync from one source of truth.
//
// No product review/rating/price data is invented here — this only ever
// emits <loc>/<lastmod> entries built from URLs and timestamps the API
// actually returned.

import { writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, '../public');

const SITE_URL = (process.env.VITE_SITE_URL || '').replace(/\/+$/, '');
const API_URL = (process.env.VITE_API_URL || '').replace(/\/+$/, '');

if (!SITE_URL || !API_URL) {
  console.error(
    'generate-sitemap: both VITE_SITE_URL and VITE_API_URL must be set.\n' +
      'Example: VITE_SITE_URL=https://example.com VITE_API_URL=https://api.example.com node scripts/generate-sitemap.mjs'
  );
  process.exit(1);
}

// Mirrors src/seo/seoUtils.js#slugify exactly. Duplicated (not imported)
// on purpose: this script runs under plain Node, not Vite, so it can't
// resolve the `@/` alias or rely on `import.meta.env` the way the app's
// own copy does — keeping this one small and dependency-free is safer
// than partially importing app code outside the environment it expects.
function slugify(name) {
  if (!name || typeof name !== 'string') return '';
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function xmlEscape(str) {
  return String(str).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
}

// Product `name` is stored as either a plain string or a per-language
// map ({ en, hi, mr }) — see src/utils/i18nUtils#getLocalized. Sitemap
// slugs use the English form for a stable, single canonical URL per
// product regardless of a visitor's language, matching what
// seoUtils#buildProductPath does at runtime.
function englishName(name) {
  if (typeof name === 'string') return name;
  return name?.en || Object.values(name || {})[0] || '';
}

async function fetchAllProducts() {
  const limit = 100;
  let page = 1;
  let totalPages = 1;
  const products = [];

  do {
    const url = `${API_URL}/api/products?page=${page}&limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`generate-sitemap: GET ${url} failed with ${res.status}`);
    }
    const body = await res.json();
    const items = body.data ?? [];
    totalPages = body.meta?.totalPages ?? 1;
    products.push(...items);
    page += 1;
  } while (page <= totalPages);

  return products;
}

function buildUrlEntry(loc, { lastmod, changefreq, priority } = {}) {
  return [
    '  <url>',
    `    <loc>${xmlEscape(loc)}</loc>`,
    lastmod ? `    <lastmod>${lastmod}</lastmod>` : null,
    changefreq ? `    <changefreq>${changefreq}</changefreq>` : null,
    priority ? `    <priority>${priority}</priority>` : null,
    '  </url>',
  ]
    .filter(Boolean)
    .join('\n');
}

async function main() {
  const products = await fetchAllProducts();
  const today = new Date().toISOString().slice(0, 10);

  const staticEntries = [
    buildUrlEntry(`${SITE_URL}/`, { changefreq: 'daily', priority: '1.0', lastmod: today }),
    buildUrlEntry(`${SITE_URL}/products`, { changefreq: 'daily', priority: '0.9', lastmod: today }),
  ];

  const productEntries = products.map((product) => {
    const id = product.id ?? product._id;
    const slug = slugify(englishName(product.name));
    const loc = `${SITE_URL}/product/${id}${slug ? `/${slug}` : ''}`;
    // Only a real updatedAt/createdAt from the API is used — no
    // fabricated freshness signal.
    const lastmod = (product.updatedAt || product.createdAt || '').slice(0, 10) || undefined;
    return buildUrlEntry(loc, { lastmod, changefreq: 'weekly', priority: '0.8' });
  });

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...staticEntries,
    ...productEntries,
    '</urlset>',
    '',
  ].join('\n');

  const outPath = path.join(PUBLIC_DIR, 'sitemap.xml');
  await writeFile(outPath, xml, 'utf8');
  console.log(`generate-sitemap: wrote ${productEntries.length} product URLs + ${staticEntries.length} static URLs to ${outPath}`);

  // Keep robots.txt's Sitemap directive pointed at the same real origin.
  const robotsPath = path.join(PUBLIC_DIR, 'robots.txt');
  const robotsContent = await readFile(robotsPath, 'utf8');
  const updatedRobots = robotsContent.replace(
    /^Sitemap:\s*.*$/m,
    `Sitemap: ${SITE_URL}/sitemap.xml`
  );
  await writeFile(robotsPath, updatedRobots, 'utf8');
  console.log(`generate-sitemap: updated Sitemap directive in ${robotsPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
