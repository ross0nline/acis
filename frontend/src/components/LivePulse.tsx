import { RiskBadge } from './RiskBadge';
import type { RegulatoryEvent } from '../types';

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

interface Props {
  events: RegulatoryEvent[];
  loading: boolean;
}

export function LivePulse({ events, loading }: Props) {
  if (loading) return <div className="text-slate-500 text-sm">Loading regulatory feed...</div>;

  if (events.length === 0) {
    return (
      <div className="text-center py-16 text-slate-500">
        <p className="text-lg mb-1">No regulatory events ingested yet</p>
        <p className="text-sm">The scraper agent will populate this feed once deployed</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {events.map(event => (
        <div key={event.id} className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 hover:border-slate-600/50 transition-colors">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-slate-500 uppercase tracking-wide">{event.source}</span>
                <span className="text-slate-600">·</span>
                <span className="text-xs text-slate-500">{timeAgo(event.ingested_at)}</span>
              </div>
              <a
                href={event.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-200 font-medium hover:text-cyan-400 transition-colors line-clamp-2"
              >
                {event.title}
              </a>
              {event.summary && (
                <p className="text-slate-400 text-sm mt-1 line-clamp-2">{event.summary}</p>
              )}
              {event.remediation_steps && (
                <div className="mt-2 p-2 bg-slate-900/50 rounded text-xs text-slate-400 border-l-2 border-cyan-500/50">
                  {(() => {
                    try {
                      const parsed = JSON.parse(event.remediation_steps!);
                      return <span><strong className="text-cyan-400">Action:</strong> {parsed.remediation_step}</span>;
                    } catch {
                      return event.remediation_steps;
                    }
                  })()}
                </div>
              )}
            </div>
            <div className="shrink-0">
              <RiskBadge score={event.risk_score} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
