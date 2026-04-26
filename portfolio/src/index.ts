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
}

const DOCS: Doc[] = [
  {
    slug: 'letter',
    title: 'Letter to Director',
    path: 'docs/brms/04-letter-to-director.md',
    description: 'Direct communication to William Hardison, Director of IT',
  },
  {
    slug: 'overview',
    title: 'System Overview',
    path: 'docs/brms/01-system-overview.md',
    description: 'Architecture, technology stack, and AI agent inventory',
  },
  {
    slug: 'alignment',
    title: 'Requirement Alignment',
    path: 'docs/brms/02-requirement-alignment.md',
    description: 'Every JD requirement mapped to a live ACIS capability',
  },
  {
    slug: 'roadmap',
    title: 'Roadmap & Vision',
    path: 'docs/brms/03-roadmap-and-vision.md',
    description: "What's built, what's planned, and what ACIS becomes at BRMS",
  },
];

const DEFAULT_PUBLISHED = new Set(['letter', 'overview', 'alignment', 'roadmap']);

// ── KV helpers ──────────────────────────────────────────────────────────────

async function isPublished(kv: KVNamespace, slug: string): Promise<boolean> {
  const val = await kv.get(`doc:${slug}`);
  if (val !== null) return val === 'published';
  return DEFAULT_PUBLISHED.has(slug);
}

async function setPublished(kv: KVNamespace, slug: string, published: boolean): Promise<void> {
  await kv.put(`doc:${slug}`, published ? 'published' : 'hidden');
}

// ── GitHub content fetcher ───────────────────────────────────────────────────

async function fetchMarkdown(env: Env, path: string): Promise<string | null> {
  const url = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${path}?ref=${env.GITHUB_BRANCH}`;
  const headers: Record<string, string> = {
    'User-Agent': 'ACIS-Portfolio/1.0',
    'Accept': 'application/vnd.github.v3.raw',
  };
  if (env.GITHUB_TOKEN) headers['Authorization'] = `Bearer ${env.GITHUB_TOKEN}`;

  const resp = await fetch(url, { headers });
  if (!resp.ok) return null;
  return resp.text();
}

// ── HTML templates ───────────────────────────────────────────────────────────

function shell(title: string, body: string, includeMermaid = false): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} — ACIS Portfolio</title>
<style>
  *, *::before, *::after { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111827; background: #f9fafb; margin: 0; padding: 0; }
  .topbar { background: #0f172a; color: #f8fafc; padding: 14px 32px; display: flex; align-items: center; gap: 16px; }
  .topbar a { color: #94a3b8; text-decoration: none; font-size: 14px; }
  .topbar a:hover { color: #f8fafc; }
  .topbar .brand { font-weight: 700; font-size: 15px; color: #f8fafc; letter-spacing: -0.01em; }
  .topbar .sep { color: #334155; }
  .content { max-width: 860px; margin: 0 auto; padding: 48px 32px; background: #fff; min-height: calc(100vh - 52px); }
  h1 { font-size: 2rem; font-weight: 700; margin: 0 0 8px; color: #0f172a; }
  h2 { font-size: 1.35rem; font-weight: 600; margin: 2rem 0 .75rem; color: #0f172a; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
  h3 { font-size: 1.1rem; font-weight: 600; margin: 1.5rem 0 .5rem; color: #1e293b; }
  p { line-height: 1.7; margin: 0 0 1rem; color: #374151; }
  a { color: #2563eb; }
  strong { color: #111827; }
  code { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 0.875em; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; color: #0f172a; }
  pre { background: #0f172a; color: #e2e8f0; padding: 20px 24px; border-radius: 8px; overflow-x: auto; margin: 1.5rem 0; }
  pre code { background: none; padding: 0; color: inherit; font-size: 0.875rem; }
  table { width: 100%; border-collapse: collapse; margin: 1.5rem 0; font-size: 14px; }
  th { background: #f8fafc; text-align: left; padding: 10px 14px; border-bottom: 2px solid #e5e7eb; font-weight: 600; color: #374151; }
  td { padding: 10px 14px; border-bottom: 1px solid #f1f5f9; color: #374151; vertical-align: top; }
  tr:last-child td { border-bottom: none; }
  hr { border: none; border-top: 1px solid #e5e7eb; margin: 2.5rem 0; }
  blockquote { border-left: 3px solid #e5e7eb; margin: 1rem 0; padding: 4px 20px; color: #6b7280; }
  ul, ol { padding-left: 1.5rem; line-height: 1.8; color: #374151; }
  li { margin-bottom: 4px; }
  .mermaid { background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px; margin: 1.5rem 0; overflow-x: auto; }
  .doc-grid { display: grid; gap: 16px; margin-top: 32px; }
  .doc-card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 20px 24px; background: #fff; text-decoration: none; display: block; transition: border-color .15s, box-shadow .15s; }
  .doc-card:hover { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,.08); }
  .doc-card h3 { margin: 0 0 6px; color: #0f172a; font-size: 1rem; }
  .doc-card p { margin: 0; font-size: 14px; color: #6b7280; line-height: 1.5; }
  .badge { display: inline-block; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 99px; background: #dbeafe; color: #1d4ed8; margin-left: 8px; vertical-align: middle; text-transform: uppercase; letter-spacing: .04em; }
  .footer { font-size: 13px; color: #9ca3af; margin-top: 48px; padding-top: 24px; border-top: 1px solid #f1f5f9; }
</style>
${includeMermaid ? `<script type="module">
  import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
  mermaid.initialize({ startOnLoad: true, theme: 'base', themeVariables: { primaryColor: '#dbeafe', primaryTextColor: '#0f172a', primaryBorderColor: '#93c5fd', lineColor: '#64748b', fontSize: '14px' } });
</script>` : ''}
</head>
<body>
<div class="topbar">
  <span class="brand">ACIS</span>
  <span class="sep">·</span>
  <a href="/">Portfolio</a>
  <span class="sep">·</span>
  <a href="https://acis.rossonlineservices.com" target="_blank">Live System ↗</a>
</div>
<div class="content">${body}</div>
</body>
</html>`;
}

function indexPage(publishedDocs: (Doc & { published: boolean })[]): string {
  const visible = publishedDocs.filter(d => d.published);
  const cards = visible.map(d => `
    <a class="doc-card" href="/${d.slug}">
      <h3>${d.title}</h3>
      <p>${d.description}</p>
    </a>`).join('');

  const body = `
    <h1>ACIS Portfolio</h1>
    <p style="color:#6b7280;margin-top:4px">Prepared for BRMS — William Hardison, Director of IT</p>
    <p style="margin-top:20px">ACIS (Autonomous Compliance Intelligence System) is a production-deployed, AI-driven compliance operations platform. The materials below document the system and its alignment to the Security Compliance Administrator II position.</p>
    <p><strong>Live system:</strong> <a href="https://acis.rossonlineservices.com">acis.rossonlineservices.com</a></p>
    <hr>
    <div class="doc-grid">${cards}</div>
    <div class="footer">ACIS — rossonlineservices.com</div>`;

  return shell('Portfolio', body);
}

function docPage(doc: Doc, htmlContent: string): string {
  const body = `
    <p style="font-size:14px;color:#6b7280;margin-bottom:24px"><a href="/">← Portfolio</a></p>
    ${htmlContent}
    <div class="footer">ACIS Portfolio — <a href="/">Back to index</a></div>`;
  return shell(doc.title, body, true);
}

function adminPage(docs: (Doc & { published: boolean })[], message?: string): string {
  const rows = docs.map(d => {
    const label = d.published
      ? '<span style="color:#16a34a;font-weight:600">Published</span>'
      : '<span style="color:#9ca3af">Hidden</span>';
    return `<tr>
      <td style="padding:14px 16px;border-bottom:1px solid #f1f5f9">
        <div style="font-weight:600;color:#0f172a;margin-bottom:2px">${d.title}</div>
        <div style="font-size:13px;color:#6b7280">${d.description}</div>
      </td>
      <td style="padding:14px 16px;border-bottom:1px solid #f1f5f9;text-align:center">${label}</td>
      <td style="padding:14px 16px;border-bottom:1px solid #f1f5f9;text-align:center">
        <form method="POST" action="/admin/toggle" style="display:inline">
          <input type="hidden" name="slug" value="${d.slug}">
          <input type="hidden" name="published" value="${d.published ? 'false' : 'true'}">
          <button type="submit" style="cursor:pointer;border:1px solid #e5e7eb;border-radius:6px;padding:6px 14px;font-size:13px;font-weight:500;background:${d.published ? '#fef2f2' : '#f0fdf4'};color:${d.published ? '#dc2626' : '#16a34a'}">${d.published ? 'Hide' : 'Publish'}</button>
        </form>
      </td>
    </tr>`;
  }).join('');

  const msg = message
    ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:12px 16px;margin-bottom:24px;color:#15803d;font-size:14px">${message}</div>`
    : '';

  const body = `
    <h1>Portfolio Admin</h1>
    <p style="color:#6b7280;margin-top:4px;margin-bottom:24px">Toggle which documents appear on the public portfolio. Changes take effect immediately.</p>
    ${msg}
    <table style="width:100%;border-collapse:collapse;font-size:14px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
      <thead>
        <tr style="background:#f8fafc">
          <th style="padding:12px 16px;text-align:left;border-bottom:2px solid #e5e7eb;font-weight:600;color:#374151">Document</th>
          <th style="padding:12px 16px;text-align:center;border-bottom:2px solid #e5e7eb;font-weight:600;color:#374151">Status</th>
          <th style="padding:12px 16px;text-align:center;border-bottom:2px solid #e5e7eb;font-weight:600;color:#374151">Action</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="margin-top:24px;font-size:13px;color:#9ca3af">Public URL: <a href="/" style="color:#2563eb">portfolio.rossonlineservices.com</a></p>`;

  return shell('Admin — Portfolio', body);
}

// ── Request handler ──────────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname.replace(/\/$/, '') || '/';

    // ── Index ────────────────────────────────────────────────────────────────
    if (pathname === '/' && request.method === 'GET') {
      const withState = await Promise.all(
        DOCS.map(async d => ({ ...d, published: await isPublished(env.PORTFOLIO_KV, d.slug) }))
      );
      return html(indexPage(withState));
    }

    // ── Admin panel ──────────────────────────────────────────────────────────
    if (pathname === '/admin' && request.method === 'GET') {
      const token = url.searchParams.get('token');
      if (token !== env.PORTFOLIO_ADMIN_TOKEN) return authPrompt();

      const withState = await Promise.all(
        DOCS.map(async d => ({ ...d, published: await isPublished(env.PORTFOLIO_KV, d.slug) }))
      );
      const msg = url.searchParams.get('msg') ?? undefined;
      return html(adminPage(withState, msg));
    }

    // ── Admin toggle ─────────────────────────────────────────────────────────
    if (pathname === '/admin/toggle' && request.method === 'POST') {
      const form = await request.formData();
      const slug = form.get('slug') as string;
      const published = form.get('published') === 'true';
      const token = url.searchParams.get('token') ?? new URL(request.headers.get('Referer') ?? request.url).searchParams.get('token');

      if (token !== env.PORTFOLIO_ADMIN_TOKEN) return authPrompt();
      if (!DOCS.find(d => d.slug === slug)) return new Response('Not found', { status: 404 });

      await setPublished(env.PORTFOLIO_KV, slug, published);
      const doc = DOCS.find(d => d.slug === slug)!;
      const msg = `${doc.title} is now ${published ? 'published' : 'hidden'}.`;
      return Response.redirect(`${url.origin}/admin?token=${token}&msg=${encodeURIComponent(msg)}`, 303);
    }

    // ── Doc viewer ───────────────────────────────────────────────────────────
    const slug = pathname.slice(1);
    const doc = DOCS.find(d => d.slug === slug);
    if (!doc) return new Response('Not found', { status: 404 });

    const published = await isPublished(env.PORTFOLIO_KV, doc.slug);
    if (!published) return new Response('Not found', { status: 404 });

    const markdown = await fetchMarkdown(env, doc.path);
    if (!markdown) return new Response('Content unavailable', { status: 503 });

    // Wrap mermaid blocks so client-side Mermaid.js picks them up
    const preprocessed = markdown.replace(/```mermaid\n([\s\S]*?)```/g, '<div class="mermaid">$1</div>');
    const htmlContent = await marked(preprocessed, { gfm: true });

    return html(docPage(doc, htmlContent as string));
  },
};

function html(body: string): Response {
  return new Response(body, { headers: { 'Content-Type': 'text/html;charset=utf-8' } });
}

function authPrompt(): Response {
  return new Response(
    `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:48px;max-width:400px;margin:0 auto">
    <h2 style="color:#0f172a">Admin Access</h2>
    <form method="GET" action="/admin">
      <input name="token" type="password" placeholder="Admin token" autofocus
        style="width:100%;padding:10px 14px;border:1px solid #e5e7eb;border-radius:6px;font-size:15px;margin-bottom:12px">
      <button type="submit" style="width:100%;padding:10px;background:#0f172a;color:#fff;border:none;border-radius:6px;font-size:15px;cursor:pointer">Sign in</button>
    </form>
    </body></html>`,
    { status: 401, headers: { 'Content-Type': 'text/html;charset=utf-8' } }
  );
}
