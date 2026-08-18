CREATE DATABASE real_estate;

\c real_estate

-- Extension (requires superuser, so run as postgres)
CREATE EXTENSION IF NOT EXISTS vector;

CREATE SCHEMA IF NOT EXISTS users;
CREATE SCHEMA IF NOT EXISTS employers;
CREATE SCHEMA IF NOT EXISTS jobs;
CREATE SCHEMA IF NOT EXISTS applications;
CREATE SCHEMA IF NOT EXISTS ads;
CREATE SCHEMA IF NOT EXISTS events;
CREATE SCHEMA IF NOT EXISTS analytics;
CREATE SCHEMA IF NOT EXISTS notifications;
CREATE SCHEMA IF NOT EXISTS master_data;
CREATE SCHEMA IF NOT EXISTS admin;
CREATE SCHEMA IF NOT EXISTS audit;

-- Grant app user access to all schemas
GRANT ALL PRIVILEGES ON DATABASE real_estate TO postgres;
GRANT ALL ON SCHEMA users, employers, jobs, applications, ads, events, analytics, notifications, master_data, admin, audit TO postgres;
ALTER ROLE postgres SET search_path TO users, employers, jobs, public;
