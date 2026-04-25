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

    for (const article of data.results) {
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

    for (const doc of data.data) {
      if (doc.attributes.withdrawn) continue;

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

  return { ingested, skipped };
}
