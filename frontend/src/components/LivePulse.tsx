import { RiskBadge } from './RiskBadge';
import type { RegulatoryEvent } from '../types';
import type { RiskFilter } from '../App';

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const FILTERS: { id: RiskFilter; label: string; color: string }[] = [
  { id: 'all',    label: 'All',    color: 'text-slate-400 border-slate-600 hover:border-slate-400' },
  { id: 'high',   label: 'High',   color: 'text-red-400 border-red-500/40 hover:border-red-400' },
  { id: 'medium', label: 'Medium', color: 'text-amber-400 border-amber-500/40 hover:border-amber-400' },
  { id: 'low',    label: 'Low',    color: 'text-slate-400 border-slate-600 hover:border-slate-400' },
];

function matchesFilter(event: RegulatoryEvent, filter: RiskFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'high')   return event.risk_score >= 8;
  if (filter === 'medium') return event.risk_score >= 5 && event.risk_score < 8;
  return event.risk_score < 5;
}

interface Props {
  events: RegulatoryEvent[];
  loading: boolean;
  riskFilter: RiskFilter;
  onFilterChange: (f: RiskFilter) => void;
}

export function LivePulse({ events, loading, riskFilter, onFilterChange }: Props) {
  if (loading) return <div className="text-slate-500 text-sm">Loading regulatory feed...</div>;

  if (events.length === 0) {
    return (
      <div className="text-center py-16 text-slate-500">
        <p className="text-lg mb-1">No regulatory events ingested yet</p>
        <p className="text-sm">The scraper agent will populate this feed once deployed</p>
      </div>
    );
  }

  const filtered = events.filter(e => matchesFilter(e, riskFilter));
  const counts: Record<RiskFilter, number> = {
    all:    events.length,
    high:   events.filter(e => e.risk_score >= 8).length,
    medium: events.filter(e => e.risk_score >= 5 && e.risk_score < 8).length,
    low:    events.filter(e => e.risk_score < 5).length,
  };

  return (
    <div className="space-y-4">
      {/* Filter chips */}
      <div className="flex items-center gap-2">
        {FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => onFilterChange(f.id)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${f.color} ${
              riskFilter === f.id ? 'bg-slate-800' : 'bg-transparent opacity-60 hover:opacity-100'
            }`}
          >
            {f.label}
            <span className="ml-1.5 opacity-70">{counts[f.id]}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-10 text-slate-500 text-sm">No {riskFilter}-risk events</div>
      )}

      {filtered.map(event => (
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

