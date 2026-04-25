-- ACIS Database Schema
-- All 5 tables for the Autonomous Compliance Intelligence System

CREATE TABLE IF NOT EXISTS regulatory_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  published_date DATETIME,
  ingested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  risk_score INTEGER DEFAULT 0,
  summary TEXT,
  tags TEXT,
  remediation_steps TEXT
);

CREATE TABLE IF NOT EXISTS attestation_vault (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_name TEXT NOT NULL,
  pbm_name TEXT,
  rxdc_status TEXT NOT NULL DEFAULT 'Pending',
  gag_clause_status TEXT NOT NULL DEFAULT 'Not Started',
  last_contact_date DATETIME,
  r2_folder_path TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vendor_risk (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vendor_name TEXT NOT NULL,
  vendor_url TEXT NOT NULL,
  contact_email TEXT,
  tls_valid INTEGER DEFAULT 0,
  headers_score INTEGER DEFAULT 0,
  ai_risk_summary TEXT,
  overall_status TEXT NOT NULL DEFAULT 'Pending Review',
  scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS incidents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  incident_type TEXT NOT NULL,
  description TEXT,
  reporter TEXT,
  status TEXT NOT NULL DEFAULT 'Open',
  playbook TEXT,
  opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  closed_at DATETIME
);

CREATE TABLE IF NOT EXISTS agent_memory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  context_key TEXT NOT NULL UNIQUE,
  context_value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Seed: initial agent memory keys
INSERT OR IGNORE INTO agent_memory (context_key, context_value) VALUES
  ('scraper_last_run', ''),
  ('cms_last_url', ''),
  ('hhs_last_url', ''),
  ('heartbeat_last_run', '');
