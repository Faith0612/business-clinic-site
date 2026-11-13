// Builds the site into /dist: copies the static pages, then generates the Blog page,
// every published article page, the sitemap and robots.txt from content/blog/*.md.
// Netlify runs this automatically on every deploy (see netlify.toml).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';
import yaml from 'js-yaml';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const site = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.json'), 'utf8'));
const SITE_URL = (site.siteUrl || '').replace(/\/+$/, '');

const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slugify = (s) => String(s).toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const imgPath = (p = '') => (p ? (p.startsWith('http') || p.startsWith('/') ? p : '/' + p) : '');
const abs = (p) => (p && SITE_URL && !p.startsWith('http') ? SITE_URL + p : p);

// 1. fresh dist with the static site
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });
const STATIC_FILES = ['index.html', 'free-resources.html', 'free-diagnosis.html', 'sales-recovery.html', 'about.html', 'privacy-policy.html', 'style.css', 'script.js'];
for (const f of STATIC_FILES) fs.copyFileSync(path.join(ROOT, f), path.join(DIST, f));
for (const d of ['images', 'admin']) fs.cpSync(path.join(ROOT, d), path.join(DIST, d), { recursive: true });

// 2. read published articles
const dir = path.join(ROOT, 'content', 'blog');
const posts = [];
for (const file of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
  if (!file.endsWith('.md')) continue;
  const raw = fs.readFileSync(path.join(dir, file), 'utf8').replace(/\r\n/g, '\n');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) { console.warn('Skipped (no front matter): ' + file); continue; }
  const fm = yaml.load(m[1]) || {};
  if (fm.published !== true) continue;
  const title = String(fm.title || '').trim();
  if (!title) { console.warn('Skipped (no title): ' + file); continue; }
  const slug = slugify(fm.slug || file.replace(/\.md$/, ''));
  const date = fm.date ? new Date(fm.date) : new Date(0);
  posts.push({ file, fm, title, slug, body: m[2].trim(), date: isNaN(date) ? new Date(0) : date });
}
posts.sort((a, b) => b.date - a.date);

// 3. split each body into the Blog-page preview and the rest of the article
const PREVIEW_CHARS = 220;
for (const p of posts) {
  const tokens = marked.lexer(p.body);
  const links = tokens.links;
  const blocks = tokens.filter((t) => t.type !== 'space');
  const prev = [];
  let n = 0;
  for (const t of blocks) {
    if (t.type !== 'paragraph') break;
    prev.push(t);
    n += t.text.length;
    if (n >= PREVIEW_CHARS || prev.length >= 3) break;
  }
  const restTokens = site.articlePageRepeatsOpening ? blocks : blocks.slice(prev.length);
  const asList = (arr) => Object.assign([...arr], { links });
  p.previewHtml = marked.parser(asList(prev));
  p.previewText = prev.map((t) => t.text).join(' ');
  let html = marked.parser(asList(restTokens));
  // a paragraph that is only a link to the Free Diagnosis page becomes a button
  html = html.replace(/<p><a href="([^"]*free-diagnosis(?:\.html)?\/?)"[^>]*>([\s\S]*?)<\/a><\/p>/g, '<p class="art-cta"><a class="btn" href="/free-diagnosis.html">$2</a></p>');
  p.bodyHtml = html;
  p.image = imgPath(p.fm.image);
  p.alt = p.fm.image_alt || p.title;
  p.url = `/blog/${p.slug}.html`;
  p.metaDesc = (p.fm.description && String(p.fm.description).trim()) || p.previewText.slice(0, 155);
  p.seoTitle = (p.fm.seo_title && String(p.fm.seo_title).trim()) || p.title;
  if (!p.fm.description) console.warn(`Note: "${p.title}" has no meta description; using the start of the article.`);
}

// 4. blog index page
const blogTpl = fs.readFileSync(path.join(ROOT, 'templates', 'blog.html'), 'utf8');
const card = (p, i) => `<article class="bcard">
  ${p.image ? `<a class="bcard-img" href="${p.url}" tabindex="-1" aria-hidden="true"><img src="${esc(p.image)}" alt="" ${i < 2 ? '' : 'loading="lazy" '}decoding="async"></a>` : ''}
  <div class="bcard-body">
    <h3><a href="${p.url}">${esc(p.title)}</a></h3>
    <div class="bcard-preview">${p.previewHtml}</div>
    <p class="bcard-more"><a class="btn" href="${p.url}">Read More<span class="sr-only"> about ${esc(p.title)}</span></a></p>
  </div>
</article>`;
const list = posts.length
  ? `<div class="blog-grid">${posts.map(card).join('\n')}</div>`
  : '<div class="blog-empty">New articles will appear here.</div>';
fs.writeFileSync(path.join(DIST, 'blog.html'), blogTpl.replace('{{BLOG_LIST}}', list));

// 5. article pages
const artTpl = fs.readFileSync(path.join(ROOT, 'templates', 'article.html'), 'utf8');
fs.mkdirSync(path.join(DIST, 'blog'), { recursive: true });
const relCount = Number(site.relatedArticlesCount) || 3;
for (const p of posts) {
  const others = posts.filter((o) => o.slug !== p.slug).slice(0, relCount);
  const related = others.length
    ? `<section class="sec related"><div class="wrap"><h2>Related Articles</h2><div class="rel-grid">${others
        .map((o) => `<article class="rel-card">${o.image ? `<a href="${o.url}" tabindex="-1" aria-hidden="true"><img src="${esc(o.image)}" alt="" loading="lazy" decoding="async"></a>` : ''}<h3><a href="${o.url}">${esc(o.title)}</a></h3></article>`)
        .join('')}</div></div></section>`
    : '';
  const body = `<section class="sec article-sec"><div class="wrap article-wrap">
  <p class="back"><a href="/blog.html">&larr; Back to the Blog</a></p>
  <h1 class="art-title">${esc(p.title)}</h1>
  ${p.image ? `<figure class="art-hero"><img src="${esc(p.image)}" alt="${esc(p.alt)}" decoding="async"></figure>` : ''}
  <div class="art-body">${p.bodyHtml}</div>
</div></section>${related}`;
  const pageUrl = SITE_URL ? SITE_URL + p.url : '';
  const head = [
    pageUrl && `<link rel="canonical" href="${esc(pageUrl)}">`,
    `<meta property="og:type" content="article">`,
    `<meta property="og:site_name" content="${esc(site.siteName)}">`,
    `<meta property="og:title" content="${esc(p.seoTitle)}">`,
    `<meta property="og:description" content="${esc(p.metaDesc)}">`,
    pageUrl && `<meta property="og:url" content="${esc(pageUrl)}">`,
    p.image && SITE_URL && `<meta property="og:image" content="${esc(abs(p.image))}">`,
    `<meta name="twitter:card" content="${p.image ? 'summary_large_image' : 'summary'}">`,
    `<meta name="twitter:title" content="${esc(p.seoTitle)}">`,
    `<meta name="twitter:description" content="${esc(p.metaDesc)}">`,
    p.image && SITE_URL && `<meta name="twitter:image" content="${esc(abs(p.image))}">`,
    `<meta property="article:published_time" content="${p.date.toISOString()}">`,
  ].filter(Boolean).join('\n');
  const html = artTpl
    .replace('{{SEO_TITLE}}', esc(p.seoTitle))
    .replace('{{META_DESCRIPTION}}', esc(p.metaDesc))
    .replace('{{HEAD_EXTRA}}', head)
    .replace('{{ARTICLE_BODY}}', () => body);
  fs.writeFileSync(path.join(DIST, 'blog', p.slug + '.html'), html);
}

// 6. sitemap + robots (needs siteUrl in site.json)
if (SITE_URL) {
  const pages = ['/', '/free-resources.html', '/blog.html', '/free-diagnosis.html', '/sales-recovery.html', '/about.html', '/privacy-policy.html', ...posts.map((p) => p.url)];
  fs.writeFileSync(path.join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map((u) => `  <url><loc>${SITE_URL}${u}</loc></url>`).join('\n')}\n</urlset>\n`);
  fs.writeFileSync(path.join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /admin/\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);
} else {
  console.warn('Note: siteUrl is empty in site.json, so sitemap.xml, canonical links and share images were skipped.');
}
console.log(`Built ${posts.length} published article(s) into dist/`);
