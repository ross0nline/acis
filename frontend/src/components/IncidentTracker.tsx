import { useState } from 'react';
import { IncidentBadge } from './RiskBadge';
import type { Incident } from '../types';

interface IncidentPlaybook {
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

const SEVERITY_COLORS: Record<string, string> = {
  Critical: 'text-red-400',
  High:     'text-orange-400',
  Medium:   'text-amber-400',
  Low:      'text-emerald-400',
};

const PHASE_COLORS: Record<string, string> = {
  detection:    'text-cyan-400',
  containment:  'text-amber-400',
  eradication:  'text-orange-400',
  recovery:     'text-emerald-400',
  post_incident:'text-slate-400',
};

const PHASE_LABELS: Record<string, string> = {
  detection:    'Detection & Analysis',
  containment:  'Containment',
  eradication:  'Eradication',
  recovery:     'Recovery',
  post_incident:'Post-Incident Review',
};

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function PlaybookView({ raw }: { raw: string }) {
  let playbook: IncidentPlaybook | null = null;
  try {
    playbook = JSON.parse(raw) as IncidentPlaybook;
  } catch {
    return <pre className="text-xs text-slate-400 whitespace-pre-wrap">{raw}</pre>;
  }

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex flex-wrap gap-3 text-xs">
        <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
          {playbook.incident_class}
        </span>
        <span className={`px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-medium ${SEVERITY_COLORS[playbook.severity] ?? 'text-slate-300'}`}>
          {playbook.severity} Severity
        </span>
        {playbook.hipaa_reportable ? (
          <span className="px-2 py-0.5 rounded bg-red-500/15 border border-red-500/30 text-red-400">
            HIPAA Reportable Breach
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">
            Not a Reportable Breach
          </span>
        )}
        {playbook.notification_deadline && (
          <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-400">
            OCR Deadline: {playbook.notification_deadline}
          </span>
        )}
      </div>

      {/* NIST phases */}
      <div className="space-y-2">
        {(Object.keys(playbook.phases) as (keyof typeof playbook.phases)[]).map(phase => (
          <div key={phase} className="flex gap-2 text-xs">
            <span className={`shrink-0 w-36 font-medium ${PHASE_COLORS[phase] ?? 'text-slate-400'}`}>
              {PHASE_LABELS[phase]}
            </span>
            <span className="text-slate-300">{playbook!.phases[phase]}</span>
          </div>
        ))}
      </div>

      {/* HIPAA obligations */}
      {playbook.hipaa_obligations && (
        <div className="text-xs border-t border-slate-700/50 pt-3">
          <span className="font-medium text-red-400">HIPAA Obligations: </span>
          <span className="text-slate-300">{playbook.hipaa_obligations}</span>
        </div>
      )}

      {/* Citations & contacts */}
      <div className="flex flex-wrap gap-6 text-xs border-t border-slate-700/50 pt-3">
        {playbook.regulatory_citations.length > 0 && (
          <div>
            <div className="text-slate-500 mb-1">Regulatory Citations</div>
            <ul className="space-y-0.5">
              {playbook.regulatory_citations.map(c => (
                <li key={c} className="text-slate-400">{c}</li>
              ))}
            </ul>
          </div>
        )}
        {playbook.escalation_contacts.length > 0 && (
          <div>
            <div className="text-slate-500 mb-1">Escalation Contacts</div>
            <ul className="space-y-0.5">
              {playbook.escalation_contacts.map(c => (
                <li key={c} className="text-slate-400">{c}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

interface Props {
  incidents: Incident[];
  loading: boolean;
}

export function IncidentTracker({ incidents, loading }: Props) {
  const [expanded, setExpanded] = useState<number | null>(null);

  if (loading) return <div className="text-slate-500 text-sm">Loading incidents...</div>;

  if (incidents.length === 0) {
    return (
      <div className="text-center py-16 text-slate-500">
        <p className="text-lg mb-1">No incidents reported</p>
        <p className="text-sm">Open an incident via the API to trigger NIST 800-61 playbook generation</p>
      </div>
    );
  }

  const open = incidents.filter(i => i.status === 'Open').length;

  return (
    <div className="space-y-4">
      {open > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
          <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
          {open} open incident{open !== 1 ? 's' : ''} require attention
        </div>
      )}

      <div className="space-y-3">
        {incidents.map(inc => (
          <div key={inc.id} className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-slate-200 font-medium">{inc.incident_type}</span>
                  <IncidentBadge status={inc.status} />
                </div>
                {inc.description && (
                  <p className="text-slate-400 text-sm">{inc.description}</p>
                )}
                <div className="flex gap-3 mt-2 text-xs text-slate-500">
                  <span>Opened {timeAgo(inc.opened_at)}</span>
                  {inc.reporter && <span>· {inc.reporter}</span>}
                  {inc.closed_at && <span>· Closed {timeAgo(inc.closed_at)}</span>}
                </div>
              </div>

              {inc.playbook && (
                <button
                  onClick={() => setExpanded(expanded === inc.id ? null : inc.id)}
                  className="shrink-0 text-xs px-2.5 py-1 rounded border border-cyan-700/50 text-cyan-400 hover:border-cyan-500 hover:bg-cyan-500/10 transition-colors"
                >
                  {expanded === inc.id ? 'Hide' : 'Playbook'}
                </button>
              )}
            </div>

            {inc.playbook && expanded === inc.id && (
              <div className="mt-4 pt-4 border-t border-slate-700/50">
                <div className="text-xs font-semibold text-cyan-400 mb-3 uppercase tracking-wider">
                  NIST 800-61 Response Playbook
                </div>
                <PlaybookView raw={inc.playbook} />
              </div>
            )}

            {!inc.playbook && (
              <div className="mt-2 text-xs text-slate-600 italic">Playbook pending generation</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
