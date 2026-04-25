export interface RegulatoryEvent {
  id: number;
  source: string;
  title: string;
  url: string;
  published_date: string | null;
  ingested_at: string;
  risk_score: number;
  summary: string | null;
  tags: string | null;
  remediation_steps: string | null;
}

export interface AttestationRecord {
  id: number;
  client_name: string;
  pbm_name: string | null;
  rxdc_status: 'Pending' | 'Submitted' | 'Confirmed' | 'Overdue';
  gag_clause_status: 'Not Started' | 'In Progress' | 'Attested' | 'Overdue';
  last_contact_date: string | null;
  updated_at: string;
}

export interface AttestationResponse {
  summary: {
    total: number;
    rxdc_completion_pct: number;
    gag_clause_completion_pct: number;
  };
  records: AttestationRecord[];
}

export interface VendorRisk {
  id: number;
  vendor_name: string;
  vendor_url: string;
  contact_email: string | null;
  tls_valid: number;
  headers_score: number;
  ai_risk_summary: string | null;
  overall_status: 'Approved' | 'Pending Review' | 'Requires Review' | 'High Risk';
  scanned_at: string;
}

export interface Incident {
  id: number;
  incident_type: string;
  description: string | null;
  reporter: string | null;
  status: 'Open' | 'Contained' | 'Remediated' | 'Closed';
  playbook: string | null;
  opened_at: string;
  closed_at: string | null;
}

export interface HeartbeatModuleStatus {
  status: 'Green' | 'Yellow' | 'Red';
  summary: string;
}

export interface HeartbeatReport {
  timestamp: string;
  overall_status: 'Green' | 'Yellow' | 'Red';
  summary: string;
  modules: {
    regulatory_pulse: HeartbeatModuleStatus;
    attestation_vault: HeartbeatModuleStatus;
    vendor_risk: HeartbeatModuleStatus;
    incident_response: HeartbeatModuleStatus;
  };
  action_items: string[];
}

export interface GatewayLog {
  id: string;
  created_at: string;
  model: string;
  provider: string;
  status_code: number;
  tokens_in: number;
  tokens_out: number;
  duration: number;
  success: boolean;
  cached: boolean;
}
