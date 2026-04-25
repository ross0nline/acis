import { IncidentBadge } from './RiskBadge';
import type { Incident } from '../types';

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

interface Props {
  incidents: Incident[];
  loading: boolean;
}

export function IncidentTracker({ incidents, loading }: Props) {
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
                  {inc.reporter && <span>· Reported by {inc.reporter}</span>}
                  {inc.closed_at && <span>· Closed {timeAgo(inc.closed_at)}</span>}
                </div>
              </div>
            </div>

            {inc.playbook && (
              <details className="mt-3">
                <summary className="text-xs text-cyan-400 cursor-pointer hover:text-cyan-300 transition-colors">
                  View NIST 800-61 Playbook
                </summary>
                <div className="mt-2 p-3 bg-slate-900/70 rounded text-xs text-slate-300 space-y-2 border border-slate-700/50">
                  {(() => {
                    try {
                      const p = JSON.parse(inc.playbook!);
                      return (
                        <>
                          {p.detection && <div><strong className="text-cyan-400">Detection:</strong> {p.detection}</div>}
                          {p.containment && <div><strong className="text-amber-400">Containment:</strong> {p.containment}</div>}
                          {p.eradication && <div><strong className="text-orange-400">Eradication:</strong> {p.eradication}</div>}
                          {p.recovery && <div><strong className="text-emerald-400">Recovery:</strong> {p.recovery}</div>}
                        </>
                      );
                    } catch {
                      return <pre className="whitespace-pre-wrap">{inc.playbook}</pre>;
                    }
                  })()}
                </div>
              </details>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
