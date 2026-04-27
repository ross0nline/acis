import Anthropic from '@anthropic-ai/sdk';
import type { Env, RiskScoreOutput } from '../types';
import { insertRegulatoryEvent } from '../db/queries';

// ── Federal Register sources ───────────────────────────────────────────────

const BASE = 'https://www.federalregister.gov/api/v1/articles.json';
const FIELDS = 'fields%5B%5D=title&fields%5B%5D=html_url&fields%5B%5D=abstract&fields%5B%5D=publication_date&fields%5B%5D=type';

const FED_REG_SOURCES = [
  { source: 'CMS',  url: `${BASE}?conditions%5Bagencies%5D%5B%5D=centers-for-medicare-medicaid-services&per_page=10&order=newest&${FIELDS}` },
  { source: 'EBSA', url: `${BASE}?conditions%5Bagencies%5D%5B%5D=employee-benefits-security-administration&per_page=10&order=newest&${FIELDS}` },
  { source: 'HHS',  url: `${BASE}?conditions%5Bagencies%5D%5B%5D=health-and-human-services-department&per_page=10&order=newest&${FIELDS}` },
];

interface FedRegArticle {
  title: string;
  html_url: string;
  abstract: string | null;
  publication_date: string;
  type: string;
}

interface FedRegResponse {
  results: FedRegArticle[];
}

// ── Regulations.gov sources ────────────────────────────────────────────────

const REG_GOV_BASE = 'https://api.regulations.gov/v4/documents';

// Agencies with the highest compliance relevance for this portfolio
const REG_GOV_AGENCIES = ['CMS', 'HHS', 'EBSA', 'OCR'];

interface RegGovDoc {
  id: string;
  attributes: {
    title: string;
    agencyId: string;
    documentType: string;
    postedDate: string;
    commentEndDate: string | null;
    commentStartDate: string | null;
    openForComment: boolean;
    withinCommentPeriod: boolean;
    withdrawn: boolean;
    frDocNum: string | null;
  };
}

interface RegGovResponse {
  data: RegGovDoc[];
  errors?: unknown;
}

// ── Firecrawl sources (press releases / fact sheets not in Federal Register) ─

const FIRECRAWL_BASE = 'https://api.firecrawl.dev/v1/scrape';

const FIRECRAWL_SOURCES = [
  { source: 'CMS-News', url: 'https://www.cms.gov/newsroom', label: 'CMS Newsroom' },
  { source: 'HHS-News', url: 'https://www.hhs.gov/press-room/index.html', label: 'HHS Press Room' },
];

interface FirecrawlResponse {
  success: boolean;
  data?: {
    markdown: string;
    metadata: { statusCode: number; url: string };
  };
}

interface ParsedNewsItem {
  title: string;
  url: string;
  date: string;
  summary: string;
  type: string;
}

// Use Claude to extract structured article list from raw newsroom markdown
async function parseNewsroomMarkdown(
  client: Anthropic,
  markdown: string,
  sourceLabel: string,
): Promise<ParsedNewsItem[]> {
  try {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: 'Extract structured article data from government newsroom markdown. Return only valid JSON array.',
      messages: [{
        role: 'user',
        content: `Extract up to 10 articles from this ${sourceLabel} listing page markdown. For each article extract:
- title: article headline
- url: full https:// URL (from "Read more" links; skip items with no URL)
- date: YYYY-MM-DD format (use current year if only month/day shown)
- summary: 1-sentence description from the snippet text
- type: article type (e.g. "Press Release", "News Alert", "Fact Sheet", "Blog Post")

Return JSON array only, no explanation:
[{"title":"...","url":"...","date":"YYYY-MM-DD","summary":"...","type":"..."}]

Markdown (first 4000 chars):
${markdown.slice(0, 4000)}`,
      }],
    });

    const text = msg.content[0].type === 'text' ? msg.content[0].text : '[]';
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleaned) as ParsedNewsItem[];
  } catch {
    return [];
  }
}

// ── URL validation ────────────────────────────────────────────────────────

async function isUrlLive(url: string): Promise<boolean> {
  if (!url.startsWith('http://') && !url.startsWith('https://')) return false;
  try {
    const resp = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(5000),
    });
    // 405 = HEAD not allowed but the resource exists; treat as live
    return resp.ok || resp.status === 405;
  } catch {
    return false;
  }
}

// Stronger check for CMS/HHS newsroom URLs: fetches the first 8KB and confirms
// that significant words from the article title appear in the page body.
// Catches soft-redirects that return 200 but serve a generic homepage.
async function verifyUrlContent(url: string, title: string): Promise<boolean> {
  if (!url.startsWith('http://') && !url.startsWith('https://')) return false;
  try {
    const resp = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(7000),
    });
    if (!resp.ok) return false;

    // Stream only the first 8KB — enough for title/headline in the HTML head
    const reader = resp.body?.getReader();
    if (!reader) return true; // can't stream, assume ok
    const chunks: Uint8Array[] = [];
    let read = 0;
    while (read < 8192) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      chunks.push(value);
      read += value.length;
    }
    await reader.cancel().catch(() => undefined);

    const body = new TextDecoder().decode(
      chunks.reduce((acc, chunk) => {
        const merged = new Uint8Array(acc.length + chunk.length);
        merged.set(acc);
        merged.set(chunk, acc.length);
        return merged;
      }, new Uint8Array())
    ).toLowerCase();

    // Extract meaningful keywords (≥5 chars, skip common stop words)
    const stop = new Set(['about','after','before','between','during','their','there','these','those','would','could','should','which','where','while','other','under','until','above','across','against','along','increase','reduce','patient','access']);
    const keywords = title.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 5 && !stop.has(w))
      .slice(0, 6);

    if (keywords.length === 0) return true;
    const hits = keywords.filter(k => body.includes(k)).length;
    // Require at least 40% of keywords to appear — tolerant of paraphrased headlines
    return hits >= Math.ceil(keywords.length * 0.4);
  } catch {
    return false;
  }
}

// ── Claude scoring ─────────────────────────────────────────────────────────

async function scoreWithClaude(
  client: Anthropic,
  title: string,
  description: string,
  source: string,
  docType: string,
  commentDeadline: string | null
): Promise<RiskScoreOutput | null> {
  try {
    const deadlineContext = commentDeadline
      ? `Comment/compliance deadline: ${commentDeadline}`
      : 'No specific deadline mentioned';

    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: `You are a HIPAA and healthcare compliance analyst for a health insurance administrator.
Analyze regulatory documents and assess their compliance impact.
Always respond with valid JSON only — no markdown, no explanation outside the JSON.`,
      messages: [{
        role: 'user',
        content: `Analyze this ${source} ${docType} and return a compliance risk assessment:

Title: ${title}
Description: ${description.slice(0, 600)}
${deadlineContext}

Return exactly this JSON:
{
  "risk_level": "High" | "Medium" | "Low",
  "impacted_field": "RxDC" | "GagClause" | "HIPAA" | "GeneralSecurity" | "Other",
  "summary": "one sentence: what this means for a health plan compliance administrator",
  "remediation_step": "one specific action to take in response to this notice",
  "deadline": "YYYY-MM-DD or empty string if no deadline"
}`,
      }],
    });

    const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleaned) as RiskScoreOutput;
  } catch {
    return null;
  }
}

function riskLevelToScore(level: string): number {
  if (level === 'High') return 9;
  if (level === 'Medium') return 5;
  return 2;
}

// ── Main scraper ───────────────────────────────────────────────────────────

export async function runScraper(env: Env): Promise<{ ingested: number; skipped: number }> {
  const client = new Anthropic({
    apiKey: env.ANTHROPIC_API_KEY,
    baseURL: env.AI_GATEWAY_URL,
  });

  let ingested = 0;
  let skipped = 0;

  // ── Federal Register ──
  for (const feed of FED_REG_SOURCES) {
    let data: FedRegResponse;
    try {
      const resp = await fetch(feed.url);
      if (!resp.ok) continue;
      data = await resp.json() as FedRegResponse;
    } catch {
      continue;
    }

    if (!Array.isArray(data.results) || data.results.length === 0) continue;

    // Validate all URLs in parallel — skip dead links before scoring
    const liveResults = (await Promise.all(
      data.results.map(async (a) => ({ a, ok: await isUrlLive(a.html_url) }))
    )).filter(({ ok }) => ok).map(({ a }) => a);

    for (const article of liveResults) {
      const existing = await env.ACIS_DB
        .prepare('SELECT id FROM regulatory_events WHERE url = ?')
        .bind(article.html_url)
        .first();
      if (existing) { skipped++; continue; }

      const scored = await scoreWithClaude(
        client,
        article.title,
        article.abstract ?? '',
        feed.source,
        article.type,
        null
      );

      await insertRegulatoryEvent(env.ACIS_DB, {
        source: feed.source,
        title: article.title,
        url: article.html_url,
        published_date: new Date(article.publication_date).toISOString(),
        risk_score: scored ? riskLevelToScore(scored.risk_level) : 0,
        summary: scored?.summary ?? null,
        tags: scored?.impacted_field ?? null,
        remediation_steps: scored ? JSON.stringify(scored) : null,
      });
      ingested++;
    }
  }

  // ── Regulations.gov ──
  for (const agencyId of REG_GOV_AGENCIES) {
    const url = `${REG_GOV_BASE}?filter%5BagencyId%5D=${agencyId}&page%5Bsize%5D=5&sort=-postedDate`;
    let data: RegGovResponse;
    try {
      const resp = await fetch(url, {
        headers: { 'X-Api-Key': env.REGULATIONS_GOV_API_KEY },
      });
      if (!resp.ok) continue;
      data = await resp.json() as RegGovResponse;
    } catch {
      continue;
    }

    if (!Array.isArray(data.data) || data.data.length === 0) continue;

    const activeDocs = data.data.filter(d => !d.attributes.withdrawn);

    // Validate all document URLs in parallel
    const liveDocFlags = await Promise.all(
      activeDocs.map(d => isUrlLive(`https://www.regulations.gov/document/${d.id}`))
    );
    const liveDocs = activeDocs.filter((_, i) => liveDocFlags[i]);

    for (const doc of liveDocs) {
      const docUrl = `https://www.regulations.gov/document/${doc.id}`;
      const existing = await env.ACIS_DB
        .prepare('SELECT id FROM regulatory_events WHERE url = ?')
        .bind(docUrl)
        .first();
      if (existing) { skipped++; continue; }

      // Boost risk score if actively open for comment (has a hard deadline)
      const hasDeadline = doc.attributes.openForComment || doc.attributes.withinCommentPeriod;
      const deadlineStr = doc.attributes.commentEndDate
        ? new Date(doc.attributes.commentEndDate).toISOString().split('T')[0]
        : null;

      const scored = await scoreWithClaude(
        client,
        doc.attributes.title,
        `${doc.attributes.documentType} from ${doc.attributes.agencyId}${hasDeadline ? ` — comment deadline: ${deadlineStr}` : ''}`,
        `Regulations.gov / ${doc.attributes.agencyId}`,
        doc.attributes.documentType,
        deadlineStr
      );

      // Documents with open comment periods get a minimum Medium score
      const baseScore = scored ? riskLevelToScore(scored.risk_level) : 0;
      const finalScore = hasDeadline ? Math.max(baseScore, 5) : baseScore;

      await insertRegulatoryEvent(env.ACIS_DB, {
        source: `REG-GOV/${doc.attributes.agencyId}`,
        title: doc.attributes.title,
        url: docUrl,
        published_date: new Date(doc.attributes.postedDate).toISOString(),
        risk_score: finalScore,
        summary: scored?.summary ?? null,
        tags: scored?.impacted_field ?? null,
        remediation_steps: scored ? JSON.stringify({
          ...scored,
          deadline: deadlineStr ?? scored.deadline,
        }) : null,
      });
      ingested++;
    }
  }

  // ── Firecrawl (CMS/HHS press releases not in Federal Register) ──
  if (env.FIRECRAWL_API_KEY) {
    for (const feed of FIRECRAWL_SOURCES) {
      let markdown: string;
      try {
        const resp = await fetch(FIRECRAWL_BASE, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.FIRECRAWL_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: feed.url,
            formats: ['markdown'],
            onlyMainContent: true,
          }),
        });
        if (!resp.ok) continue;
        const fcData = await resp.json() as FirecrawlResponse;
        if (!fcData.success || !fcData.data?.markdown) continue;
        markdown = fcData.data.markdown;
      } catch {
        continue;
      }

      const articles = await parseNewsroomMarkdown(client, markdown, feed.label);
      if (articles.length === 0) continue;

      // Filter malformed entries, then verify content in parallel
      // Uses GET + keyword check (not HEAD) to catch CMS/HHS soft-redirects
      const candidates = articles.filter(a => a.url && a.title);
      const liveArticleFlags = await Promise.all(candidates.map(a => verifyUrlContent(a.url, a.title)));
      const liveArticles = candidates.filter((_, i) => liveArticleFlags[i]);

      for (const article of liveArticles) {

        const existing = await env.ACIS_DB
          .prepare('SELECT id FROM regulatory_events WHERE url = ?')
          .bind(article.url)
          .first();
        if (existing) { skipped++; continue; }

        const scored = await scoreWithClaude(
          client,
          article.title,
          article.summary,
          feed.source,
          article.type,
          null
        );

        await insertRegulatoryEvent(env.ACIS_DB, {
          source: feed.source,
          title: article.title,
          url: article.url,
          published_date: article.date ? new Date(article.date).toISOString() : new Date().toISOString(),
          risk_score: scored ? riskLevelToScore(scored.risk_level) : 0,
          summary: scored?.summary ?? article.summary,
          tags: scored?.impacted_field ?? null,
          remediation_steps: scored ? JSON.stringify(scored) : null,
        });
        ingested++;
      }
    }
  }

  return { ingested, skipped };
}
