import { marked } from 'marked';

interface Env {
  PORTFOLIO_KV: KVNamespace;
  PORTFOLIO_ADMIN_TOKEN: string;
  GITHUB_TOKEN?: string;
  GITHUB_OWNER: string;
  GITHUB_REPO: string;
  GITHUB_BRANCH: string;
}

interface Doc {
  slug: string;
  title: string;
  path: string;
  description: string;
  accent: string;
  accentDark: string;
}

const DOCS: Doc[] = [
  {
    slug: 'letter',
    title: 'Letter to Director',
    path: 'docs/brms/04-letter-to-director.md',
    description: 'Direct communication to William Hardison, Director of IT',
    accent: '#7c3aed',
    accentDark: '#a78bfa',
  },
  {
    slug: 'overview',
    title: 'System Overview',
    path: 'docs/brms/01-system-overview.md',
    description: 'Architecture, technology stack, and AI agent inventory',
    accent: '#0284c7',
    accentDark: '#38bdf8',
  },
  {
    slug: 'alignment',
    title: 'Requirement Alignment',
    path: 'docs/brms/02-requirement-alignment.md',
    description: 'Every JD requirement mapped to a live ACIS capability',
    accent: '#059669',
    accentDark: '#34d399',
  },
  {
    slug: 'roadmap',
    title: 'Roadmap & Vision',
    path: 'docs/brms/03-roadmap-and-vision.md',
    description: "What's built, what's planned, and the vision for BRMS",
    accent: '#d97706',
    accentDark: '#fbbf24',
  },
  {
    slug: 'narrative',
    title: 'The Build Story',
    path: 'docs/brms/05-system-narrative.md',
    description: 'Architecture decisions, build sequence, and what the system demonstrates',
    accent: '#0f766e',
    accentDark: '#2dd4bf',
  },
];

const DEFAULT_PUBLISHED = new Set(['letter', 'overview', 'alignment', 'roadmap', 'narrative']);

// ── PWA static assets ─────────────────────────────────────────────────────────

const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <rect width="64" height="64" rx="12" fill="#0f172a"/>
  <path d="M32 8 L52 18 L52 34 C52 45 43 54 32 57 C21 54 12 45 12 34 L12 18 Z" fill="#7c3aed" opacity="0.25"/>
  <path d="M32 10 L50 19.5 L50 34 C50 44 42 52.5 32 55.5 C22 52.5 14 44 14 34 L14 19.5 Z" stroke="#a78bfa" stroke-width="1.5" fill="none"/>
  <text x="32" y="40" font-family="system-ui,-apple-system,sans-serif" font-size="22" font-weight="700" fill="#a78bfa" text-anchor="middle">P</text>
</svg>`;

const MANIFEST = JSON.stringify({
  name: 'ACIS Portfolio — Ross',
  short_name: 'Portfolio',
  description: 'HIPAA compliance operations portfolio for William Hardison, Director of IT at BRMS',
  start_url: '/',
  display: 'standalone',
  background_color: '#0f172a',
  theme_color: '#0f172a',
  icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
});

const SERVICE_WORKER = `
const CACHE='portfolio-v1';
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(['/'])));
  self.skipWaiting();
});
self.addEventListener('activate',e=>{e.waitUntil(clients.claim());});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);
  if(url.pathname.startsWith('/admin'))return;
  e.respondWith(
    fetch(e.request).then(resp=>{
      if(resp.ok){const c=resp.clone();caches.open(CACHE).then(cache=>cache.put(e.request,c));}
      return resp;
    }).catch(()=>caches.match(e.request).then(c=>c||caches.match('/')))
  );
});`;

// ── KV helpers ───────────────────────────────────────────────────────────────

async function isPublished(kv: KVNamespace, slug: string): Promise<boolean> {
  const val = await kv.get(`doc:${slug}`);
  if (val !== null) return val === 'published';
  return DEFAULT_PUBLISHED.has(slug);
}

async function setPublished(kv: KVNamespace, slug: string, published: boolean): Promise<void> {
  await kv.put(`doc:${slug}`, published ? 'published' : 'hidden');
}

// ── GitHub content fetcher ────────────────────────────────────────────────────

async function fetchMarkdown(env: Env, path: string): Promise<{ content: string } | { error: string }> {
  let fetchUrl: string;
  const headers: Record<string, string> = { 'User-Agent': 'ACIS-Portfolio/1.0' };

  if (env.GITHUB_TOKEN) {
    fetchUrl = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${path}?ref=${env.GITHUB_BRANCH}`;
    headers['Accept'] = 'application/vnd.github.v3.raw';
    headers['Authorization'] = `Bearer ${env.GITHUB_TOKEN}`;
  } else {
    fetchUrl = `https://raw.githubusercontent.com/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/${env.GITHUB_BRANCH}/${path}`;
  }

  try {
    const resp = await fetch(fetchUrl, { headers });
    if (!resp.ok) return { error: `HTTP ${resp.status} from ${fetchUrl}` };
    const content = await resp.text();
    if (!content) return { error: `Empty response from ${fetchUrl}` };
    return { content };
  } catch (err) {
    return { error: `Fetch threw: ${err instanceof Error ? err.message : String(err)} — URL: ${fetchUrl}` };
  }
}

// ── HTML shell ───────────────────────────────────────────────────────────────

const DARK_MODE_SCRIPT = `<script>
(function(){
  var s=localStorage.getItem('theme');
  if(s==='dark'||(!s&&matchMedia('(prefers-color-scheme:dark)').matches))
    document.documentElement.classList.add('dark');
})();
</script>`;

const THEME_TOGGLE_SCRIPT = `<script>
document.getElementById('theme-btn').addEventListener('click',function(){
  var dark=document.documentElement.classList.toggle('dark');
  localStorage.setItem('theme',dark?'dark':'light');
  this.textContent=dark?'☀':'🌙';
});
var _d=document.documentElement.classList.contains('dark');
document.getElementById('theme-btn').textContent=_d?'☀':'🌙';
</script>`;

const CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#f9fafb;--surface:#fff;--surface2:#f1f5f9;--border:#e5e7eb;
  --text:#374151;--muted:#6b7280;--heading:#0f172a;
  --link:#2563eb;--code:#f1f5f9;--code-text:#1e293b;--pre:#1e293b;--pre-text:#e2e8f0;
  --topbar:#0f172a;--topbar-text:#f8fafc;--topbar-muted:#94a3b8;--topbar-border:#1e293b;
  --card-hover:#f8fafc;
}
.dark{
  --bg:#0f172a;--surface:#1e293b;--surface2:#0f172a;--border:#334155;
  --text:#cbd5e1;--muted:#64748b;--heading:#f1f5f9;
  --link:#60a5fa;--code:#0f172a;--code-text:#e2e8f0;--pre:#020617;--pre-text:#e2e8f0;
  --topbar:#020617;--topbar-text:#f8fafc;--topbar-muted:#475569;--topbar-border:#1e293b;
  --card-hover:#263044;
}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:var(--bg);color:var(--text);line-height:1.6;min-height:100vh;transition:background .2s,color .2s}
a{color:var(--link);text-decoration:none}
a:hover{text-decoration:underline}

/* Topbar */
.topbar{background:var(--topbar);border-bottom:1px solid var(--topbar-border);padding:0 24px;height:52px;display:flex;align-items:center;gap:0;position:sticky;top:0;z-index:100}
.topbar-brand{font-weight:700;font-size:15px;color:var(--topbar-text);letter-spacing:-.01em;margin-right:4px}
.topbar-subtitle{font-size:13px;color:var(--topbar-muted);margin-right:auto;padding-left:2px}
.topbar-link{font-size:13px;color:var(--topbar-muted);padding:6px 12px;border-radius:6px;transition:color .15s,background .15s}
.topbar-link:hover{color:var(--topbar-text);background:rgba(255,255,255,.06);text-decoration:none}
.topbar-live{font-size:13px;font-weight:500;color:#60a5fa;padding:6px 12px;border-radius:6px;border:1px solid rgba(96,165,250,.25);transition:background .15s}
.topbar-live:hover{background:rgba(96,165,250,.1);text-decoration:none}
.topbar-divider{width:1px;height:20px;background:var(--topbar-border);margin:0 4px}
#theme-btn{background:none;border:1px solid var(--topbar-border);border-radius:6px;color:var(--topbar-muted);cursor:pointer;font-size:14px;padding:4px 8px;margin-left:8px;transition:color .15s,border-color .15s}
#theme-btn:hover{color:var(--topbar-text);border-color:var(--topbar-muted)}

/* Content */
.page{max-width:860px;margin:0 auto;padding:48px 24px 80px}

/* Index */
.index-hero{margin-bottom:40px;padding-bottom:32px;border-bottom:1px solid var(--border)}
.index-hero h1{font-size:2rem;font-weight:700;color:var(--heading);letter-spacing:-.02em;margin-bottom:8px}
.index-hero p{color:var(--muted);font-size:15px;line-height:1.6;max-width:600px;margin-bottom:20px}
.hero-actions{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.btn-primary{display:inline-flex;align-items:center;gap:6px;background:#2563eb;color:#fff;padding:9px 18px;border-radius:8px;font-size:14px;font-weight:500;transition:background .15s}
.btn-primary:hover{background:#1d4ed8;text-decoration:none;color:#fff}
.btn-secondary{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--border);color:var(--muted);padding:9px 18px;border-radius:8px;font-size:14px;font-weight:500;transition:border-color .15s,color .15s}
.btn-secondary:hover{border-color:var(--link);color:var(--link);text-decoration:none}
.doc-grid{display:grid;gap:12px}
.doc-card{display:block;background:var(--surface);border:1px solid var(--border);border-left:3px solid var(--accent);border-radius:8px;padding:18px 20px;transition:background .15s,box-shadow .15s}
.doc-card:hover{background:var(--card-hover);box-shadow:0 2px 12px rgba(0,0,0,.06);text-decoration:none}
.doc-card-title{font-size:15px;font-weight:600;color:var(--heading);margin-bottom:4px}
.doc-card-desc{font-size:13px;color:var(--muted);line-height:1.5}

/* Doc page */
.doc-back{font-size:13px;color:var(--muted);margin-bottom:28px;display:inline-flex;align-items:center;gap:4px}
.doc-back:hover{color:var(--link)}
.doc-nav{display:flex;justify-content:space-between;align-items:center;margin-top:48px;padding-top:24px;border-top:1px solid var(--border);gap:12px}
.doc-nav a{font-size:13px;color:var(--muted);border:1px solid var(--border);border-radius:6px;padding:8px 14px;transition:color .15s,border-color .15s;max-width:48%}
.doc-nav a:hover{color:var(--link);border-color:var(--link);text-decoration:none}
.doc-nav .nav-prev::before{content:'← '}
.doc-nav .nav-next::after{content:' →'}
.doc-nav .nav-empty{flex:1}

/* Markdown content */
.prose h1{font-size:1.9rem;font-weight:700;color:var(--heading);margin:0 0 8px;letter-spacing:-.02em}
.prose h2{font-size:1.2rem;font-weight:600;color:var(--heading);margin:2.5rem 0 .75rem;padding-bottom:8px;border-bottom:1px solid var(--border)}
.prose h3{font-size:1rem;font-weight:600;color:var(--heading);margin:1.75rem 0 .5rem}
.prose p{color:var(--text);line-height:1.75;margin-bottom:1rem}
.prose strong{color:var(--heading);font-weight:600}
.prose em{font-style:italic}
.prose a{color:var(--link)}
.prose ul,.prose ol{padding-left:1.5rem;margin-bottom:1rem}
.prose li{margin-bottom:6px;color:var(--text);line-height:1.7}
.prose hr{border:none;border-top:1px solid var(--border);margin:2.5rem 0}
.prose blockquote{border-left:3px solid var(--border);padding:4px 20px;color:var(--muted);margin:1rem 0}
.prose code{font-family:'SF Mono','Fira Code',monospace;font-size:.85em;background:var(--code);color:var(--code-text);padding:2px 6px;border-radius:4px}
.prose pre{background:var(--pre);border-radius:8px;padding:20px 24px;overflow-x:auto;margin:1.5rem 0}
.prose pre code{background:none;color:var(--pre-text);font-size:.875rem;padding:0}
.prose table{width:100%;border-collapse:collapse;font-size:14px;margin:1.5rem 0}
.prose th{background:var(--surface2);text-align:left;padding:10px 14px;border-bottom:2px solid var(--border);font-weight:600;color:var(--heading);font-size:13px}
.prose td{padding:10px 14px;border-bottom:1px solid var(--border);color:var(--text);vertical-align:top}
.prose tr:last-child td{border-bottom:none}
.table-wrap{overflow-x:auto;margin:1.5rem 0}
.table-wrap table{margin:0}
.mermaid{background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:24px;margin:1.5rem 0;overflow-x:auto}

/* Footer */
.footer{margin-top:48px;padding-top:20px;border-top:1px solid var(--border);font-size:12px;color:var(--muted)}
`;

function shell(title: string, body: string, opts: { docTitle?: string; mermaid?: boolean } = {}): string {
  const topbarMid = opts.docTitle
    ? `<span class="topbar-subtitle">/ ${opts.docTitle}</span>`
    : `<span class="topbar-subtitle">/ Portfolio</span>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} — ACIS</title>
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#0f172a">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Portfolio">
${DARK_MODE_SCRIPT}
<style>${CSS}</style>
${opts.mermaid ? `<script type="module">
import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
mermaid.initialize({startOnLoad:true,theme:'base',themeVariables:{primaryColor:'#dbeafe',primaryTextColor:'#0f172a',primaryBorderColor:'#93c5fd',lineColor:'#64748b',fontSize:'14px'}});
</script>` : ''}
</head>
<body>
<nav class="topbar">
  <span class="topbar-brand">ACIS</span>
  ${topbarMid}
  <a class="topbar-link" href="/">Index</a>
  <div class="topbar-divider"></div>
  <a class="topbar-live" href="https://acis.rossonlineservices.com" target="_blank" rel="noopener">Live System ↗</a>
  <button id="theme-btn" title="Toggle dark mode">🌙</button>
</nav>
<div class="page">${body}</div>
${THEME_TOGGLE_SCRIPT}
<script>if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js');</script>
</body>
</html>`;
}

// ── Page builders ─────────────────────────────────────────────────────────────

function indexPage(docs: (Doc & { published: boolean })[]): string {
  const visible = docs.filter(d => d.published);
  const cards = visible.map(d => `
    <a class="doc-card" href="/${d.slug}" style="--accent:${d.accent}">
      <div class="doc-card-title">${d.title}</div>
      <div class="doc-card-desc">${d.description}</div>
    </a>`).join('');

  const body = `
    <div class="index-hero">
      <h1>ACIS Portfolio</h1>
      <p>A production-deployed, AI-driven compliance operations platform — reviewed for William Hardison, Director of IT at BRMS. These materials document the system and its direct alignment to the Security Compliance Administrator II position.</p>
      <div class="hero-actions">
        <a class="btn-primary" href="https://acis.rossonlineservices.com" target="_blank" rel="noopener">Open Live System ↗</a>
        <a class="btn-secondary" href="/letter">Start with the letter →</a>
      </div>
    </div>
    <div class="doc-grid">${cards}</div>
    <div class="footer">Ross — rossonlineservices.com</div>`;

  return shell('Portfolio', body);
}

function docPage(doc: Doc, docIndex: number, htmlContent: string): string {
  const prev = docIndex > 0 ? DOCS[docIndex - 1] : null;
  const next = docIndex < DOCS.length - 1 ? DOCS[docIndex + 1] : null;

  const prevLink = prev
    ? `<a class="nav-prev" href="/${prev.slug}">${prev.title}</a>`
    : `<span class="nav-empty"></span>`;
  const nextLink = next
    ? `<a class="nav-next" href="/${next.slug}">${next.title}</a>`
    : `<span class="nav-empty"></span>`;

  const body = `
    <a class="doc-back" href="/">← All documents</a>
    <div class="prose">${htmlContent}</div>
    <div class="doc-nav">${prevLink}${nextLink}</div>
    <div class="footer">ACIS Portfolio — <a href="/">Back to index</a></div>`;

  return shell(doc.title, body, { docTitle: doc.title, mermaid: true });
}

function adminPage(docs: (Doc & { published: boolean })[], message?: string): string {
  const rows = docs.map(d => {
    const label = d.published
      ? '<span style="color:#16a34a;font-weight:600">Published</span>'
      : '<span style="color:var(--muted)">Hidden</span>';
    return `<tr>
      <td style="padding:14px 16px;border-bottom:1px solid var(--border)">
        <div style="font-weight:600;color:var(--heading);margin-bottom:2px">${d.title}</div>
        <div style="font-size:13px;color:var(--muted)">${d.description}</div>
      </td>
      <td style="padding:14px 16px;border-bottom:1px solid var(--border);text-align:center">${label}</td>
      <td style="padding:14px 16px;border-bottom:1px solid var(--border);text-align:center">
        <form method="POST" action="/admin/toggle" style="display:inline">
          <input type="hidden" name="slug" value="${d.slug}">
          <input type="hidden" name="published" value="${d.published ? 'false' : 'true'}">
          <button type="submit" style="cursor:pointer;border:1px solid var(--border);border-radius:6px;padding:6px 14px;font-size:13px;font-weight:500;background:var(--surface);color:var(--text)">${d.published ? 'Hide' : 'Publish'}</button>
        </form>
      </td>
    </tr>`;
  }).join('');

  const msg = message
    ? `<div style="background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:12px 16px;margin-bottom:24px;color:var(--text);font-size:14px">${message}</div>`
    : '';

  const body = `
    <h1 style="font-size:1.5rem;font-weight:700;color:var(--heading);margin-bottom:6px">Portfolio Admin</h1>
    <p style="color:var(--muted);font-size:14px;margin-bottom:24px">Toggle which documents appear publicly. Changes take effect immediately.</p>
    ${msg}
    <div style="border:1px solid var(--border);border-radius:8px;overflow:hidden">
    <table style="width:100%;border-collapse:collapse;font-size:14px;background:var(--surface)">
      <thead>
        <tr style="background:var(--surface2)">
          <th style="padding:12px 16px;text-align:left;border-bottom:2px solid var(--border);font-weight:600;color:var(--heading)">Document</th>
          <th style="padding:12px 16px;text-align:center;border-bottom:2px solid var(--border);font-weight:600;color:var(--heading)">Status</th>
          <th style="padding:12px 16px;text-align:center;border-bottom:2px solid var(--border);font-weight:600;color:var(--heading)">Action</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    </div>
    <p style="margin-top:20px;font-size:13px;color:var(--muted)">Public: <a href="/">portfolio.rossonlineservices.com</a></p>`;

  return shell('Admin', body, { docTitle: 'Admin' });
}

// ── Request handler ───────────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname.replace(/\/$/, '') || '/';

    if (pathname === '/icon.svg')
      return new Response(ICON_SVG, { headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public,max-age=86400' } });
    if (pathname === '/manifest.json')
      return new Response(MANIFEST, { headers: { 'Content-Type': 'application/manifest+json', 'Cache-Control': 'public,max-age=3600' } });
    if (pathname === '/sw.js')
      return new Response(SERVICE_WORKER, { headers: { 'Content-Type': 'application/javascript', 'Cache-Control': 'no-cache' } });

    if (pathname === '/' && request.method === 'GET') {
      const withState = await Promise.all(
        DOCS.map(async d => ({ ...d, published: await isPublished(env.PORTFOLIO_KV, d.slug) }))
      );
      return html(indexPage(withState));
    }

    if (pathname === '/admin' && request.method === 'GET') {
      const token = url.searchParams.get('token');
      if (token !== env.PORTFOLIO_ADMIN_TOKEN) return authPrompt();
      const withState = await Promise.all(
        DOCS.map(async d => ({ ...d, published: await isPublished(env.PORTFOLIO_KV, d.slug) }))
      );
      return html(adminPage(withState, url.searchParams.get('msg') ?? undefined));
    }

    if (pathname === '/admin/toggle' && request.method === 'POST') {
      const form = await request.formData();
      const slug = form.get('slug') as string;
      const published = form.get('published') === 'true';
      const token = url.searchParams.get('token')
        ?? new URL(request.headers.get('Referer') ?? request.url).searchParams.get('token');
      if (token !== env.PORTFOLIO_ADMIN_TOKEN) return authPrompt();
      if (!DOCS.find(d => d.slug === slug)) return html('<p>Not found</p>', 404);
      await setPublished(env.PORTFOLIO_KV, slug, published);
      const doc = DOCS.find(d => d.slug === slug)!;
      return Response.redirect(
        `${url.origin}/admin?token=${token}&msg=${encodeURIComponent(`${doc.title} is now ${published ? 'published' : 'hidden'}.`)}`,
        303
      );
    }

    const slug = pathname.slice(1);
    const docIndex = DOCS.findIndex(d => d.slug === slug);
    if (docIndex === -1) return html(errorPage('Not found', 'This document does not exist.'), 404);
    const doc = DOCS[docIndex];

    try {
      const published = await isPublished(env.PORTFOLIO_KV, doc.slug);
      if (!published) return html(errorPage('Not found', 'This document is not currently available.'), 404);

      const fetched = await fetchMarkdown(env, doc.path);
      if ('error' in fetched) return html(errorPage('Content unavailable', fetched.error), 503);

      const preprocessed = fetched.content.replace(/```mermaid\n([\s\S]*?)```/g, '<div class="mermaid">$1</div>');
      const result = marked(preprocessed, { gfm: true });
      const htmlContent = result instanceof Promise ? await result : result;

      return html(docPage(doc, docIndex, htmlContent));
    } catch (err) {
      return html(errorPage('Error', err instanceof Error ? err.message : String(err)), 500);
    }
  },
};

function html(body: string, status = 200): Response {
  return new Response(body, { status, headers: { 'Content-Type': 'text/html;charset=utf-8' } });
}

function errorPage(title: string, detail: string): string {
  return shell(title, `
    <h1 style="font-size:1.5rem;font-weight:700;color:#dc2626;margin-bottom:16px">${title}</h1>
    <pre style="background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:16px;font-size:13px;white-space:pre-wrap;color:var(--text)">${detail}</pre>
    <p style="margin-top:20px"><a href="/">← Back to index</a></p>`);
}

function authPrompt(): Response {
  return new Response(
    `<!DOCTYPE html><html><head><meta charset="utf-8">
    <style>body{font-family:system-ui,sans-serif;background:#0f172a;color:#f8fafc;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
    .box{background:#1e293b;border:1px solid #334155;border-radius:12px;padding:36px;width:340px}
    h2{font-size:1.1rem;font-weight:600;margin-bottom:20px;color:#f1f5f9}
    input{width:100%;padding:10px 14px;background:#0f172a;border:1px solid #334155;border-radius:6px;color:#f8fafc;font-size:14px;margin-bottom:12px;outline:none}
    input:focus{border-color:#60a5fa}
    button{width:100%;padding:10px;background:#2563eb;color:#fff;border:none;border-radius:6px;font-size:14px;font-weight:500;cursor:pointer}
    button:hover{background:#1d4ed8}</style>
    </head><body><div class="box">
    <h2>Admin Access</h2>
    <form method="GET" action="/admin">
      <input name="token" type="password" placeholder="Token" autofocus>
      <button type="submit">Sign in</button>
    </form></div></body></html>`,
    { status: 401, headers: { 'Content-Type': 'text/html;charset=utf-8' } }
  );
}
