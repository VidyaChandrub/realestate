-- Migration: Add specialization sync history table for Others Specializations sync tracking

CREATE SCHEMA IF NOT EXISTS reports;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS reports.specialization_sync_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  synced_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_specialization_sync_history_synced_at_desc
  ON reports.specialization_sync_history (synced_at DESC);
