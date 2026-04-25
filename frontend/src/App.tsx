import { useState, useEffect, useCallback } from 'react';
import type { RegulatoryEvent, AttestationResponse, VendorRisk, Incident } from './types';
import { LivePulse } from './components/LivePulse';
import { AttestationPanel } from './components/AttestationPanel';
import { VendorBoard } from './components/VendorBoard';
import { IncidentTracker } from './components/IncidentTracker';
import { OperationsPanel } from './components/OperationsPanel';

const API = 'https://acis.rossonlineservices.workers.dev';

type Tab = 'pulse' | 'attestation' | 'vendors' | 'incidents' | 'operations';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'pulse',       label: 'Live Pulse',    icon: '⚡' },
  { id: 'attestation', label: 'Attestation',   icon: '📋' },
  { id: 'vendors',     label: 'Vendor Risk',   icon: '🔍' },
  { id: 'incidents',   label: 'Incidents',     icon: '🚨' },
  { id: 'operations',  label: 'Operations',    icon: '⚙️' },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('pulse');

  const [events, setEvents] = useState<RegulatoryEvent[]>([]);
  const [attestation, setAttestation] = useState<AttestationResponse | null>(null);
  const [vendors, setVendors] = useState<VendorRisk[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);

  const [loading, setLoading] = useState({ pulse: true, attestation: true, vendors: true, incidents: true, operations: false });
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchAll = useCallback(async () => {
    setLoading({ pulse: true, attestation: true, vendors: true, incidents: true, operations: false });
    const [e, a, v, i] = await Promise.allSettled([
      fetch(`${API}/api/regulatory`).then(r => r.json() as Promise<RegulatoryEvent[]>),
      fetch(`${API}/api/attestation`).then(r => r.json() as Promise<AttestationResponse>),
      fetch(`${API}/api/vendors`).then(r => r.json() as Promise<VendorRisk[]>),
      fetch(`${API}/api/incidents`).then(r => r.json() as Promise<Incident[]>),
    ]);
    if (e.status === 'fulfilled') setEvents(e.value);
    if (a.status === 'fulfilled') setAttestation(a.value);
    if (v.status === 'fulfilled') setVendors(v.value);
    if (i.status === 'fulfilled') setIncidents(i.value);
    setLoading({ pulse: false, attestation: false, vendors: false, incidents: false, operations: false });
    setLastRefresh(new Date());
  }, []);

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  const openIncidents = incidents.filter(i => i.status === 'Open').length;
  const highRiskEvents = events.filter(e => e.risk_score >= 8).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-100 tracking-tight">
              ACIS
              <span className="ml-2 text-xs font-normal text-slate-500 tracking-normal">
                Autonomous Compliance Intelligence System
              </span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-500">
              Updated {lastRefresh.toLocaleTimeString()}
            </span>
            <button
              onClick={() => void fetchAll()}
              className="text-xs px-3 py-1.5 rounded border border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-300 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-slate-100">{events.length}</div>
            <div className="text-xs text-slate-500 mt-0.5">Regulatory Events</div>
            {highRiskEvents > 0 && (
              <div className="text-xs text-red-400 mt-1">{highRiskEvents} high risk</div>
            )}
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-slate-100">
              {attestation ? `${attestation.summary.rxdc_completion_pct}%` : '—'}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">RxDC Completion</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-slate-100">{vendors.length}</div>
            <div className="text-xs text-slate-500 mt-0.5">Vendors Assessed</div>
            {vendors.filter(v => v.overall_status === 'High Risk').length > 0 && (
              <div className="text-xs text-red-400 mt-1">
                {vendors.filter(v => v.overall_status === 'High Risk').length} high risk
              </div>
            )}
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <div className={`text-2xl font-bold ${openIncidents > 0 ? 'text-red-400' : 'text-slate-100'}`}>
              {openIncidents}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">Open Incidents</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-800">
          <nav className="flex gap-1">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  tab === t.id
                    ? 'border-cyan-500 text-cyan-400'
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                <span className="mr-1.5">{t.icon}</span>
                {t.label}
                {t.id === 'incidents' && openIncidents > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-red-500/20 text-red-400 rounded-full">
                    {openIncidents}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Panel */}
        <div>
          {tab === 'pulse'       && <LivePulse events={events} loading={loading.pulse} />}
          {tab === 'attestation' && <AttestationPanel data={attestation} loading={loading.attestation} />}
          {tab === 'vendors'     && <VendorBoard vendors={vendors} loading={loading.vendors} />}
          {tab === 'incidents'   && <IncidentTracker incidents={incidents} loading={loading.incidents} />}
          {tab === 'operations'  && <OperationsPanel />}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 mt-16 py-6">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between text-xs text-slate-600">
          <span>ACIS — Compliance Operations Center</span>
          <span>Powered by Cloudflare Workers + Claude AI</span>
        </div>
      </footer>
    </div>
  );
}
