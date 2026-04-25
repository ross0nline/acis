import { AttestationBadge } from './RiskBadge';
import type { AttestationResponse } from '../types';

interface ProgressBarProps {
  label: string;
  pct: number;
  color: string;
}

function ProgressBar({ label, pct, color }: ProgressBarProps) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm text-slate-300">{label}</span>
        <span className="text-sm font-semibold text-slate-200">{pct}%</span>
      </div>
      <div className="h-2.5 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

interface Props {
  data: AttestationResponse | null;
  loading: boolean;
}

export function AttestationPanel({ data, loading }: Props) {
  if (loading) return <div className="text-slate-500 text-sm">Loading attestation records...</div>;

  if (!data || data.summary.total === 0) {
    return (
      <div className="text-center py-16 text-slate-500">
        <p className="text-lg mb-1">No attestation records yet</p>
        <p className="text-sm">Add client records via the API to track RxDC and Gag Clause compliance</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-slate-100">{data.summary.total}</div>
          <div className="text-sm text-slate-400 mt-1">Total Clients</div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
          <ProgressBar label="RxDC Reporting" pct={data.summary.rxdc_completion_pct} color="bg-cyan-500" />
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
          <ProgressBar label="Gag Clause Attestation" pct={data.summary.gag_clause_completion_pct} color="bg-teal-500" />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-700/50">
              <th className="pb-2 pr-4 font-medium">Client</th>
              <th className="pb-2 pr-4 font-medium">PBM</th>
              <th className="pb-2 pr-4 font-medium">RxDC Status</th>
              <th className="pb-2 pr-4 font-medium">Gag Clause</th>
              <th className="pb-2 font-medium">Last Contact</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/30">
            {data.records.map(r => (
              <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                <td className="py-3 pr-4 text-slate-200 font-medium">{r.client_name}</td>
                <td className="py-3 pr-4 text-slate-400">{r.pbm_name ?? '—'}</td>
                <td className="py-3 pr-4"><AttestationBadge status={r.rxdc_status} /></td>
                <td className="py-3 pr-4"><AttestationBadge status={r.gag_clause_status} /></td>
                <td className="py-3 text-slate-400">{r.last_contact_date ? new Date(r.last_contact_date).toLocaleDateString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
