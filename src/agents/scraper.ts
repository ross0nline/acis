import Anthropic from '@anthropic-ai/sdk';
import type { Env, RiskScoreOutput } from '../types';
import { insertRegulatoryEvent } from '../db/queries';

// Federal Register API — open, no auth, machine-readable
const BASE = 'https://www.federalregister.gov/api/v1/articles.json';
const FIELDS = 'fields%5B%5D=title&fields%5B%5D=html_url&fields%5B%5D=abstract&fields%5B%5D=publication_date&fields%5B%5D=type';

const SOURCES = [
  // CMS — Medicare/Medicaid rules, RxDC reporting requirements
  {
    source: 'CMS',
    url: `${BASE}?conditions%5Bagencies%5D%5B%5D=centers-for-medicare-medicaid-services&per_page=10&order=newest&${FIELDS}`,
  },
  // EBSA — administers Gag Clause prohibition, RxDC data submission, ERISA health plans
  {
    source: 'EBSA',
    url: `${BASE}?conditions%5Bagencies%5D%5B%5D=employee-benefits-security-administration&per_page=10&order=newest&${FIELDS}`,
  },
  // HHS — HIPAA enforcement, general health policy
  {
    source: 'HHS',
    url: `${BASE}?conditions%5Bagencies%5D%5B%5D=health-and-human-services-department&per_page=10&order=newest&${FIELDS}`,
  },
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

async function scoreWithClaude(
  client: Anthropic,
  article: FedRegArticle,
  source: string
): Promise<RiskScoreOutput | null> {
  try {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: `You are a HIPAA and healthcare compliance analyst for a health insurance administrator.
Analyze regulatory documents from the Federal Register and assess their compliance impact.
Always respond with valid JSON only — no markdown, no explanation outside the JSON.`,
      messages: [{
        role: 'user',
        content: `Analyze this ${source} Federal Register ${article.type} and return a compliance risk assessment:

Title: ${article.title}
Abstract: ${(article.abstract ?? 'No abstract available').slice(0, 600)}
Published: ${article.publication_date}

Return exactly this JSON:
{
  "risk_level": "High" | "Medium" | "Low",
  "impacted_field": "RxDC" | "GagClause" | "HIPAA" | "GeneralSecurity" | "Other",
  "summary": "one sentence: what this means for a health plan compliance administrator",
  "remediation_step": "one specific action to take in response to this notice",
  "deadline": "YYYY-MM-DD or empty string if no deadline mentioned"
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

export async function runScraper(env: Env): Promise<{ ingested: number; skipped: number }> {
  const client = new Anthropic({
    apiKey: env.ANTHROPIC_API_KEY,
    baseURL: env.AI_GATEWAY_URL,
  });

  let ingested = 0;
  let skipped = 0;

  for (const feed of SOURCES) {
    let data: FedRegResponse;
    try {
      const resp = await fetch(feed.url);
      if (!resp.ok) continue;
      data = await resp.json() as FedRegResponse;
    } catch {
      continue;
    }

    if (!Array.isArray(data.results) || data.results.length === 0) continue;

    for (const article of data.results) {
      // INSERT OR IGNORE means already-seen URLs are silently skipped
      const existing = await env.ACIS_DB
        .prepare('SELECT id FROM regulatory_events WHERE url = ?')
        .bind(article.html_url)
        .first();

      if (existing) { skipped++; continue; }

      const scored = await scoreWithClaude(client, article, feed.source);

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

  return { ingested, skipped };
}
