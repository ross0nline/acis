interface Props {
  score: number;
}

export function RiskBadge({ score }: Props) {
  if (score >= 8) return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30">HIGH</span>;
  if (score >= 5) return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">MEDIUM</span>;
  return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-500/20 text-slate-400 border border-slate-500/30">LOW</span>;
}

interface StatusProps {
  status: string;
}

export function AttestationBadge({ status }: StatusProps) {
  const map: Record<string, string> = {
    'Confirmed': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    'Attested': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    'Submitted': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    'In Progress': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    'Pending': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    'Not Started': 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    'Overdue': 'bg-red-500/20 text-red-400 border-red-500/30',
  };
  const cls = map[status] ?? 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  return <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${cls}`}>{status}</span>;
}

export function VendorBadge({ status }: StatusProps) {
  const map: Record<string, string> = {
    'Approved': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    'Pending Review': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    'Requires Review': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    'High Risk': 'bg-red-500/20 text-red-400 border-red-500/30',
  };
  const cls = map[status] ?? 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  return <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${cls}`}>{status}</span>;
}

export function IncidentBadge({ status }: StatusProps) {
  const map: Record<string, string> = {
    'Open': 'bg-red-500/20 text-red-400 border-red-500/30',
    'Contained': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    'Remediated': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    'Closed': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  };
  const cls = map[status] ?? 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  return <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${cls}`}>{status}</span>;
}
