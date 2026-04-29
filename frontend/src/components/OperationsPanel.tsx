import { useState, useEffect, useCallback } from 'react';
import type { HeartbeatReport, GatewayLog } from '../types';

const API = 'https://acis.rossonlineservices.workers.dev';
const TOKEN_KEY = 'acis_admin_token';

type TriggerStatus = 'idle' | 'loading' | 'success' | 'error';
interface TriggerState { status: TriggerStatus; message?: string }

const STATUS_COLOR = {
  Green:  'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  Yellow: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  Red:    'text-red-400 bg-red-500/10 border-red-500/30',
};
const STATUS_DOT = { Green: 'bg-emerald-400', Yellow: 'bg-amber-400', Red: 'bg-red-400' };
const MODULE_LABELS: Record<string, string> = {
  regulatory_pulse:  'Regulatory Pulse',
  attestation_vault: 'Attestation Vault',
  vendor_risk:       'Vendor Risk',
  incident_response: 'Incident Response',
};

function StatusBadge({ status }: { status: 'Green' | 'Yellow' | 'Red' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLOR[status]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[status]}`} />
      {status}
    </span>
  );
}

interface OperationsPanelProps {
  onDataRefresh?: () => void;
}

export function OperationsPanel({ onDataRefresh }: OperationsPanelProps) {
  const [token, setToken]           = useState(() => localStorage.getItem(TOKEN_KEY) ?? '');
  const [tokenVisible, setTokenVisible] = useState(false);
  const [adminExpanded, setAdminExpanded] = useState(false);

  const [scraperState,   setScraperState]   = useState<TriggerState>({ status: 'idle' });
  const [heartbeatState, setHeartbeatState] = useState<TriggerState>({ status: 'idle' });
  const [scanState,      setScanState]      = useState<TriggerState>({ status: 'idle' });

  const [heartbeat, setHeartbeat] = useState<HeartbeatReport | null>(null);
  const [hbLoading, setHbLoading] = useState(true);

  const [logs, setLogs]                   = useState<GatewayLog[]>([]);
  const [logsConfigured, setLogsConfigured] = useState<boolean | null>(null);
  const [logsLoading, setLogsLoading]     = useState(true);

  const saveToken = (val: string) => {
    setToken(val);
    localStorage.setItem(TOKEN_KEY, val);
  };

  const fetchHeartbeat = useCallback(async () => {
    setHbLoading(true);
    try {
      const r = await fetch(`${API}/api/heartbeat/last`);
      if (r.ok) setHeartbeat(await r.json() as HeartbeatReport);
    } finally {
      setHbLoading(false);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const r = await fetch(`${API}/api/logs`);
      const data = await r.json() as { logs: GatewayLog[]; configured: boolean };
      setLogs(data.logs);
      setLogsConfigured(data.configured);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => { void fetchHeartbeat(); void fetchLogs(); }, [fetchHeartbeat, fetchLogs]);

  const trigger = async (
    path: string,
    setState: (s: TriggerState) => void,
    summarize: (data: unknown) => string,
  ) => {
    setState({ status: 'loading' });
    try {
      const r = await fetch(`${API}${path}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await r.json();
      if (!r.ok) {
        setState({ status: 'error', message: (data as { error?: string }).error ?? `HTTP ${r.status}` });
        return;
      }
      setState({ status: 'success', message: summarize(data) });
      if (path.includes('heartbeat')) void fetchHeartbeat();
      if (path.includes('vendor')) { void fetchLogs(); onDataRefresh?.(); }
      if (path.includes('scraper')) onDataRefresh?.();
    } catch (e) {
      setState({ status: 'error', message: e instanceof Error ? e.message : 'Request failed' });
    }
  };

  const runScraper   = () => trigger('/api/scraper/run',      setScraperState,
    (d) => { const x = d as { ingested?: number; skipped?: number }; return `Ingested ${x.ingested ?? 0}, skipped ${x.skipped ?? 0}`; });
  const runHeartbeat = () => trigger('/api/heartbeat/run',    setHeartbeatState,
    (d) => { const x = d as { overall_status?: string }; return `${x.overall_status ?? 'Done'}`; });
  const scanAll      = () => trigger('/api/vendors/scan-all', setScanState,
    (d) => { const x = d as { scanned?: number }; return `Scanned ${x.scanned ?? 0} vendors`; });

  const tokenSet = token.trim().length > 0;

  return (
    <div className="space-y-8">

      {/* ── Last Heartbeat ──────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">System Health</h2>
            <p className="text-xs text-slate-600 mt-0.5">Daily self-audit — runs automatically at 08:00 UTC</p>
          </div>
          <div className="flex items-center gap-3">
            {heartbeat && (
              <span className="text-xs text-slate-600">
                {new Date(heartbeat.timestamp).toLocaleString()}
              </span>
            )}
            <button
              onClick={() => tokenSet ? runHeartbeat() : setAdminExpanded(true)}
              disabled={heartbeatState.status === 'loading'}
              title={tokenSet ? 'Re-run system health audit' : 'Set admin token in Admin Controls to recheck'}
              className={`text-xs transition-colors ${
                heartbeatState.status === 'loading'
                  ? 'text-cyan-600 cursor-wait'
                  : heartbeatState.status === 'success'
                  ? 'text-emerald-400'
                  : heartbeatState.status === 'error'
                  ? 'text-red-400 hover:text-red-300'
                  : tokenSet
                  ? 'text-slate-500 hover:text-slate-300'
                  : 'text-slate-700 hover:text-slate-500'
              }`}
            >
              {heartbeatState.status === 'loading' ? 'Checking…'
                : heartbeatState.status === 'success' ? `✓ ${heartbeatState.message}`
                : heartbeatState.status === 'error' ? '✕ Failed'
                : tokenSet ? 'Recheck' : 'Recheck ↓'}
            </button>
          </div>
        </div>

        {hbLoading ? (
          <div className="text-sm text-slate-500 animate-pulse">Loading…</div>
        ) : !heartbeat ? (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 text-center">
            <div className="text-slate-400 text-sm font-medium mb-1">No heartbeat on record</div>
            <p className="text-slate-600 text-xs">
              The system audits itself daily at 08:00 UTC and produces a Green / Yellow / Red health report.
              Set a token in Admin Controls and use Recheck above to trigger one manually.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className={`rounded-lg border p-4 flex items-start gap-4 ${STATUS_COLOR[heartbeat.overall_status]}`}>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <StatusBadge status={heartbeat.overall_status} />
                  <span className="text-xs text-slate-400">Overall System Health</span>
                </div>
                <p className="text-sm text-slate-300">{heartbeat.summary}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(Object.entries(heartbeat.modules) as [string, { status: 'Green' | 'Yellow' | 'Red'; summary: string }][]).map(([key, mod]) => (
                <div key={key} className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-500 font-medium">{MODULE_LABELS[key] ?? key}</span>
                    <StatusBadge status={mod.status} />
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{mod.summary}</p>
                </div>
              ))}
            </div>

            {heartbeat.action_items.length > 0 && (
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4">
                <div className="text-xs font-medium text-amber-400 mb-2">Action Items</div>
                <ul className="space-y-1">
                  {heartbeat.action_items.map((item, i) => (
                    <li key={i} className="text-xs text-amber-300/80 flex gap-2">
                      <span className="text-amber-500 shrink-0">→</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── Agent Logs ──────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Agent Logs</h2>
            <p className="text-xs text-slate-600 mt-0.5">Every Claude inference call — model, tokens, latency, status</p>
          </div>
          <button onClick={() => void fetchLogs()} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
            Refresh
          </button>
        </div>

        {logsLoading ? (
          <div className="text-sm text-slate-500 animate-pulse">Loading…</div>
        ) : logsConfigured === false ? (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 text-center">
            <div className="text-slate-400 text-sm font-medium mb-1">Log streaming not yet active</div>
            <p className="text-slate-500 text-xs max-w-sm mx-auto">
              AI inference logs are routed through Cloudflare AI Gateway. Full log streaming requires a backend configuration token with AI Gateway read access.
            </p>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-sm text-slate-500">No log entries found.</div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[560px]">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500">
                  <th className="text-left px-4 py-3 font-medium">Time</th>
                  <th className="text-left px-4 py-3 font-medium">Model</th>
                  <th className="text-right px-4 py-3 font-medium">In</th>
                  <th className="text-right px-4 py-3 font-medium">Out</th>
                  <th className="text-right px-4 py-3 font-medium">Duration</th>
                  <th className="text-center px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-3 text-cyan-400 font-mono">{log.model}</td>
                    <td className="px-4 py-3 text-slate-300 text-right tabular-nums">
                      {log.tokens_in?.toLocaleString() ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-300 text-right tabular-nums">
                      {log.tokens_out?.toLocaleString() ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-right tabular-nums whitespace-nowrap">
                      {log.duration ? `${(log.duration / 1000).toFixed(1)}s` : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                        log.success ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                      }`}>
                        {log.status_code ?? (log.success ? '200' : 'ERR')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </section>

      {/* ── Admin Controls ──────────────────────────────────────────── */}
      <section className="border border-slate-800 rounded-lg overflow-hidden">
        <button
          onClick={() => setAdminExpanded(v => !v)}
          className="w-full flex items-center justify-between px-5 py-4 bg-slate-900 hover:bg-slate-800/60 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-slate-500 text-sm">🔒</span>
            <span className="text-sm font-medium text-slate-400">Admin Controls</span>
            {tokenSet && (
              <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                Unlocked
              </span>
            )}
          </div>
          <span className="text-slate-600 text-xs">{adminExpanded ? '▲' : '▼'}</span>
        </button>

        {adminExpanded && (
          <div className="p-5 bg-slate-900/50 border-t border-slate-800 space-y-6">

            {/* Token input */}
            <div>
              <div className="text-xs text-slate-500 mb-2">Admin Token</div>
              <div className="flex gap-2">
                <input
                  type={tokenVisible ? 'text' : 'password'}
                  value={token}
                  onChange={e => saveToken(e.target.value)}
                  placeholder="Paste admin token…"
                  className="flex-1 bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-600"
                />
                <button
                  onClick={() => setTokenVisible(v => !v)}
                  className="px-3 py-2 text-xs border border-slate-700 rounded text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {tokenVisible ? 'Hide' : 'Show'}
                </button>
                {tokenSet && (
                  <button
                    onClick={() => saveToken('')}
                    className="px-3 py-2 text-xs border border-slate-700 rounded text-slate-500 hover:text-red-400 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Triggers */}
            <div>
              <div className="text-xs text-slate-500 mb-3">Manual Triggers</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {([
                  { label: 'Run Scraper',      desc: 'Ingest today\'s regulatory events from all 5 sources', state: scraperState,   run: runScraper },
                  { label: 'Run Heartbeat',    desc: 'Audit all four modules and update System Health above', state: heartbeatState, run: runHeartbeat },
                  { label: 'Scan All Vendors', desc: 'TLS + security header scan via claude-opus-4-7',       state: scanState,      run: scanAll },
                ] as const).map(({ label, desc, state, run }) => (
                  <div key={label} className="bg-slate-950 border border-slate-800 rounded-lg p-4 flex flex-col gap-3">
                    <div>
                      <div className="text-xs font-medium text-slate-300">{label}</div>
                      <div className="text-xs text-slate-600 mt-0.5">{desc}</div>
                    </div>
                    <button
                      onClick={run}
                      disabled={!tokenSet || state.status === 'loading'}
                      className={`w-full py-2 rounded text-xs font-medium transition-colors ${
                        !tokenSet
                          ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                          : state.status === 'loading'
                          ? 'bg-cyan-900/40 text-cyan-600 cursor-wait'
                          : 'bg-cyan-600/20 text-cyan-400 border border-cyan-600/40 hover:bg-cyan-600/30'
                      }`}
                    >
                      {state.status === 'loading' ? 'Running…' : !tokenSet ? '🔒 Token required' : 'Run'}
                    </button>
                    {state.status === 'success' && (
                      <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-3 py-2">
                        ✓ {state.message}
                      </div>
                    )}
                    {state.status === 'error' && (
                      <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">
                        ✕ {state.message}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </section>

    </div>
  );
}
