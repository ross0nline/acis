import Anthropic from '@anthropic-ai/sdk';

export interface IncidentPlaybook {
  incident_class: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  hipaa_reportable: boolean;
  notification_deadline: string | null;
  phases: {
    detection: string;
    containment: string;
    eradication: string;
    recovery: string;
    post_incident: string;
  };
  hipaa_obligations: string;
  regulatory_citations: string[];
  escalation_contacts: string[];
}

export async function generatePlaybook(
  client: Anthropic,
  incidentType: string,
  description: string,
  reporter: string | null,
): Promise<IncidentPlaybook | null> {
  try {
    const msg = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 2048,
      system: `You are a HIPAA Privacy and Security Officer with 15 years of healthcare compliance experience.
You generate incident response playbooks aligned to NIST SP 800-61 Rev 2 and 45 CFR Parts 160 and 164.
Always respond with valid JSON only — no markdown, no explanation outside the JSON.`,
      messages: [{
        role: 'user',
        content: `Generate a NIST 800-61 incident response playbook for this healthcare compliance incident:

Type: ${incidentType}
Description: ${description.slice(0, 800)}
Reported by: ${reporter ?? 'Unknown'}

Return exactly this JSON structure:
{
  "incident_class": "short classification (e.g. HIPAA Privacy Breach, Ransomware, Unauthorized Access)",
  "severity": "Critical" | "High" | "Medium" | "Low",
  "hipaa_reportable": true | false,
  "notification_deadline": "YYYY-MM-DD (60 days from today if reportable breach) or null",
  "phases": {
    "detection": "2-3 sentences: how to confirm scope, document findings, preserve evidence",
    "containment": "2-3 sentences: immediate steps to stop ongoing harm or exposure",
    "eradication": "2-3 sentences: root cause removal and system hardening",
    "recovery": "2-3 sentences: return to normal operations, validation steps",
    "post_incident": "2-3 sentences: lessons learned, policy updates, workforce training"
  },
  "hipaa_obligations": "1-2 sentences: specific HIPAA breach notification requirements for this incident type (individuals, HHS OCR, media if 500+)",
  "regulatory_citations": ["cite 2-3 specific CFR sections or NIST controls most relevant to this incident"],
  "escalation_contacts": ["list 3-4 roles who must be notified for this incident type"]
}`,
      }],
    });

    const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleaned) as IncidentPlaybook;
  } catch (err) {
    console.error('[playbook] generation failed:', err instanceof Error ? err.message : String(err));
    return null;
  }
}
