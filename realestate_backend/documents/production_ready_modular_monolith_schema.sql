
-- =====================================================
-- Production-Ready Modular Monolith PostgreSQL Schema
-- =====================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- SCHEMAS
-- =====================================================
CREATE SCHEMA IF NOT EXISTS users;
CREATE SCHEMA IF NOT EXISTS employers;
CREATE SCHEMA IF NOT EXISTS jobs;
CREATE SCHEMA IF NOT EXISTS applications;
CREATE SCHEMA IF NOT EXISTS ads;
CREATE SCHEMA IF NOT EXISTS events;
CREATE SCHEMA IF NOT EXISTS feed;
CREATE SCHEMA IF NOT EXISTS analytics;
CREATE SCHEMA IF NOT EXISTS notifications;
CREATE SCHEMA IF NOT EXISTS media;
CREATE SCHEMA IF NOT EXISTS master_data;
CREATE SCHEMA IF NOT EXISTS admin;
CREATE SCHEMA IF NOT EXISTS audit;

-- =====================================================
-- USERS MODULE
-- =====================================================
CREATE TABLE users.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('USER','EMPLOYER','ADMIN')),
    is_active BOOLEAN DEFAULT TRUE,
    is_onboarded BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE users.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL,
    full_name TEXT,
    gender TEXT,
    state TEXT,
    city TEXT,
    education TEXT,
    experience_level TEXT,
    profile_completion_percentage INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- EMPLOYERS MODULE
-- =====================================================
CREATE TABLE employers.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    industry TEXT,
    description TEXT,
    website TEXT,
    verification_status TEXT CHECK (verification_status IN ('PENDING','VERIFIED','REJECTED')) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE employers.employer_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    user_id UUID NOT NULL,
    role TEXT CHECK (role IN ('OWNER','HR','RECRUITER')),
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- JOBS MODULE
-- =====================================================
CREATE TABLE jobs.jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    summary TEXT,
    location TEXT,
    state TEXT,
    experience_required TEXT,
    salary_min INT,
    salary_max INT,
    employment_type TEXT,
    status TEXT CHECK (status IN ('DRAFT','ACTIVE','EXPIRED','ARCHIVED')) DEFAULT 'DRAFT',
    published_at TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_jobs_status ON jobs.jobs(status);
CREATE INDEX idx_jobs_state ON jobs.jobs(state);

-- =====================================================
-- APPLICATIONS MODULE
-- =====================================================
CREATE TABLE applications.applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL,
    user_id UUID NOT NULL,
    cover_note TEXT,
    status TEXT CHECK (status IN ('SUBMITTED','VIEWED','SHORTLISTED','REJECTED','HIRED')) DEFAULT 'SUBMITTED',
    applied_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX uniq_application_per_user_job
ON applications.applications(job_id, user_id);

-- =====================================================
-- ADS MODULE
-- =====================================================
CREATE TABLE ads.campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    name TEXT NOT NULL,
    type TEXT CHECK (type IN ('IMAGE','VIDEO','SPONSORED_JOB','SPONSORED_EVENT')),
    status TEXT CHECK (status IN ('DRAFT','APPROVED','ACTIVE','PAUSED','ENDED')) DEFAULT 'DRAFT',
    budget_total NUMERIC(12,2),
    budget_spent NUMERIC(12,2) DEFAULT 0,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE ads.delivery_stats (
    campaign_id UUID PRIMARY KEY,
    impressions BIGINT DEFAULT 0,
    clicks BIGINT DEFAULT 0,
    video_completions BIGINT DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- EVENTS MODULE
-- =====================================================
CREATE TABLE events.events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    mode TEXT CHECK (mode IN ('ONLINE','OFFLINE')),
    location TEXT,
    capacity INT,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    status TEXT CHECK (status IN ('DRAFT','ACTIVE','CANCELLED','COMPLETED')) DEFAULT 'DRAFT',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE events.registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL,
    user_id UUID NOT NULL,
    status TEXT CHECK (status IN ('REGISTERED','ATTENDED','CANCELLED')) DEFAULT 'REGISTERED',
    registered_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- ANALYTICS MODULE
-- =====================================================
CREATE TABLE analytics.events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    item_type TEXT,
    item_id UUID,
    event_type TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_analytics_created_at ON analytics.events(created_at);

-- =====================================================
-- NOTIFICATIONS MODULE
-- =====================================================
CREATE TABLE notifications.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    type TEXT,
    title TEXT,
    message TEXT,
    entity_type TEXT,
    entity_id UUID,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications.notifications(user_id);

-- =====================================================
-- MASTER DATA MODULE
-- =====================================================
CREATE TABLE master_data.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT,
    value TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0
);

-- =====================================================
-- AUDIT MODULE
-- =====================================================
CREATE TABLE audit.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type TEXT,
    entity_id UUID,
    action TEXT,
    performed_by UUID,
    old_value JSONB,
    new_value JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- ADMIN MODULE
-- =====================================================
CREATE TABLE admin.moderation_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type TEXT,
    entity_id UUID,
    action TEXT,
    admin_user_id UUID,
    reason TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- END OF SCHEMA
-- =====================================================
