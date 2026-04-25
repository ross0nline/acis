import { VendorBadge } from './RiskBadge';
import type { VendorRisk } from '../types';

interface Props {
  vendors: VendorRisk[];
  loading: boolean;
}

export function VendorBoard({ vendors, loading }: Props) {
  if (loading) return <div className="text-slate-500 text-sm">Loading vendor assessments...</div>;

  if (vendors.length === 0) {
    return (
      <div className="text-center py-16 text-slate-500">
        <p className="text-lg mb-1">No vendors assessed yet</p>
        <p className="text-sm">Submit a vendor URL via the API to trigger TLS and AI risk scoring</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {vendors.map(v => (
        <div key={v.id} className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <span className="text-slate-200 font-medium">{v.vendor_name}</span>
                <VendorBadge status={v.overall_status} />
              </div>
              <a href={v.vendor_url} target="_blank" rel="noopener noreferrer"
                className="text-xs text-slate-500 hover:text-cyan-400 transition-colors">
                {v.vendor_url}
              </a>
              <div className="flex gap-4 mt-2">
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${v.tls_valid ? 'bg-emerald-400' : 'bg-red-400'}`} />
                  <span className="text-xs text-slate-400">{v.tls_valid ? 'TLS Valid' : 'TLS Invalid'}</span>
                </div>
                <div className="text-xs text-slate-400">
                  Security Headers: <span className={`font-medium ${v.headers_score >= 70 ? 'text-emerald-400' : v.headers_score >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
                    {v.headers_score}/100
                  </span>
                </div>
              </div>
              {v.ai_risk_summary && (
                <div className="mt-2 p-2 bg-slate-900/50 rounded text-xs text-slate-400 border-l-2 border-cyan-500/50">
                  {(() => {
                    try {
                      const parsed = JSON.parse(v.ai_risk_summary!);
                      return parsed.summary ?? v.ai_risk_summary;
                    } catch {
                      return v.ai_risk_summary;
                    }
                  })()}
                </div>
              )}
            </div>
            <div className="text-xs text-slate-500 shrink-0">
              {new Date(v.scanned_at).toLocaleDateString()}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
