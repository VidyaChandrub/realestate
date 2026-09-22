-- Auto-generated idempotent schema ensure (from prisma schema).
-- Safe to re-run. Used by PrismaService.ensureProductionSchema / deploy backfill.
CREATE SCHEMA IF NOT EXISTS "identity";
CREATE SCHEMA IF NOT EXISTS "access";
CREATE SCHEMA IF NOT EXISTS "audit";
CREATE SCHEMA IF NOT EXISTS "billing";
CREATE SCHEMA IF NOT EXISTS "templates";
CREATE SCHEMA IF NOT EXISTS "projects";

DO $$ BEGIN
  CREATE TYPE "identity"."OrgStatus" AS ENUM (
'draft', 'active', 'disabled', 'pending', 'rejected'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "identity"."UserStatus" AS ENUM (
'active', 'disabled', 'pending'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "identity"."OnboardingStep" AS ENUM (
'account', 'organisation', 'business_details', 'modules', 'subscription', 'templates', 'invite', 'connect', 'completed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "identity"."RoleScope" AS ENUM (
'platform', 'organisation', 'team'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "identity"."UnitPriceBasis" AS ENUM (
'carpet', 'builtup'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "identity"."OrgIndustry" AS ENUM (
'developer', 'broker', 'channel', 'mixed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "identity"."RoleStatus" AS ENUM (
'active', 'inactive'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "access"."TeamStatus" AS ENUM (
'active', 'inactive'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "access"."TeamMemberRole" AS ENUM (
'team_lead', 'sr_agent', 'sales_agent', 'telecaller', 'viewer'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "audit"."NotificationType" AS ENUM (
'organisation_registration', 'subdomain_request', 'custom_domain_request', 'organisation_approved', 'organisation_rejected', 'support_ticket_created', 'support_ticket_message', 'support_ticket_status_changed', 'support_ticket_assigned', 'subscription_expiring', 'subscription_past_due', 'subscription_expired', 'package_change_request', 'package_change_approved', 'package_change_rejected'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "audit"."SupportTicketStatus" AS ENUM (
'open', 'ongoing', 'on_hold', 'resolved'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "audit"."SupportTicketPriority" AS ENUM (
'normal', 'high', 'urgent'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "templates"."TemplateStatus" AS ENUM (
'draft', 'published', 'scheduled', 'password', 'unpublished'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "templates"."TemplateKind" AS ENUM (
'preset', 'custom'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "templates"."TemplatePageType" AS ENUM (
'landing', 'thank_you'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "templates"."TemplateTier" AS ENUM (
'free', 'paid', 'premium'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "billing"."BillingCycle" AS ENUM (
'monthly', 'yearly'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "billing"."SubscriptionStatus" AS ENUM (
'active', 'past_due', 'trial', 'cancelled', 'paused', 'expired'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "billing"."PackageChangeRequestStatus" AS ENUM (
'pending', 'approved', 'rejected', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "templates"."LandingPageStatus" AS ENUM (
'draft', 'pending_approval', 'approved', 'rejected', 'published', 'unpublished'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "templates"."OrgDomainRequestKind" AS ENUM (
'subdomain', 'custom_domain'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "templates"."OrgDomainRequestStatus" AS ENUM (
'pending', 'approved', 'rejected', 'connected'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "templates"."CallDirection" AS ENUM (
'outgoing', 'incoming'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "templates"."ActivityType" AS ENUM (
'closed_deal', 'site_visit_booked', 'call_logged', 'whatsapp_sent', 'whatsapp_read', 'note_added', 'status_updated', 'logged_in'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "projects"."ProjectStatus" AS ENUM (
'active', 'inactive'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "templates"."LeadStatus" AS ENUM (
'new', 'contacted', 'follow_up', 'site_visit', 'negotiation', 'won', 'lost'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "projects"."UnitStatus" AS ENUM (
'available', 'booked', 'held', 'sold'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "projects"."OrgCatalogCategory" AS ENUM (
'project_type', 'unit_type', 'connectivity', 'amenity', 'price_includes', 'payment_plan', 'facing', 'parking', 'unit_variant', 'lead_purpose', 'lead_financing', 'lead_loan_status', 'lead_timeline_to_buy', 'lead_preferred_floor', 'lead_tag'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE TABLE IF NOT EXISTS "identity"."org_types" (

    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_types_pkey" PRIMARY KEY ("id")

);

CREATE TABLE IF NOT EXISTS "identity"."organisations" (

    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "city" TEXT,
    "status" "identity"."OrgStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "default_language" TEXT NOT NULL DEFAULT 'en-IN',
    "logo_url" TEXT,
    "favicon_url" TEXT,
    "brand_colour" TEXT,
    "website" TEXT,
    "address_line1" TEXT,
    "address_line2" TEXT,
    "state" TEXT,
    "postal_code" TEXT,
    "country" TEXT,
    "rera_license_no" TEXT,
    "gstin" TEXT,
    "team_size" TEXT,
    "legal_name" TEXT,
    "industry" "identity"."OrgIndustry",
    "unit_price_basis" "identity"."UnitPriceBasis" NOT NULL DEFAULT 'carpet',
    "support_email" TEXT,
    "support_phone" TEXT,
    "enabled_modules" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "subdomain" TEXT,
    "subdomain_status" TEXT NOT NULL DEFAULT 'pending',
    "custom_domain" TEXT,
    "custom_domain_status" TEXT NOT NULL DEFAULT 'none',
    "custom_domain_landing_page_id" TEXT,
    "rejection_reason" TEXT,

    CONSTRAINT "organisations_pkey" PRIMARY KEY ("id")

);

CREATE TABLE IF NOT EXISTS "identity"."users" (

    "id" TEXT NOT NULL,
    "org_id" TEXT,
    "first_name" TEXT,
    "last_name" TEXT,
    "email" TEXT NOT NULL,
    "phone_number" TEXT,
    "password_hash" TEXT NOT NULL,
    "status" "identity"."UserStatus" NOT NULL DEFAULT 'active',
    "must_change_password" BOOLEAN NOT NULL DEFAULT false,
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_at" TIMESTAMP(3),
    "token_invalid_before" TIMESTAMP(3),
    "onboarding_step" "identity"."OnboardingStep" NOT NULL DEFAULT 'account',
    "country" TEXT,
    "email_verified_at" TIMESTAMP(3),
    "terms_accepted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")

);

CREATE TABLE IF NOT EXISTS "identity"."roles" (

    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scope" "identity"."RoleScope" NOT NULL,
    "org_id" TEXT,
    "status" "identity"."RoleStatus" NOT NULL DEFAULT 'active',
    "description" TEXT DEFAULT '',
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")

);

CREATE TABLE IF NOT EXISTS "identity"."user_roles" (

    "user_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id","role_id")

);

CREATE TABLE IF NOT EXISTS "identity"."refresh_tokens" (

    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "user_agent" TEXT,
    "ip_address" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")

);

CREATE TABLE IF NOT EXISTS "identity"."password_reset_tokens" (

    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")

);

CREATE TABLE IF NOT EXISTS "identity"."email_verification_tokens" (

    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id")

);

CREATE TABLE IF NOT EXISTS "access"."teams" (

    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "access"."TeamStatus" NOT NULL DEFAULT 'active',
    "team_lead_id" TEXT,
    "region" TEXT,
    "working_hours" TEXT,
    "description" TEXT DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")

);

CREATE TABLE IF NOT EXISTS "access"."team_members" (

    "team_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "access"."TeamMemberRole" NOT NULL DEFAULT 'sales_agent',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("team_id","user_id")

);

CREATE TABLE IF NOT EXISTS "access"."team_projects" (

    "team_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_projects_pkey" PRIMARY KEY ("team_id","project_id")

);

CREATE TABLE IF NOT EXISTS "access"."team_module_access" (

    "team_id" TEXT NOT NULL,
    "module_key" TEXT NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "team_module_access_pkey" PRIMARY KEY ("team_id","module_key")

);

CREATE TABLE IF NOT EXISTS "access"."role_module_permissions" (

    "org_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "module_key" TEXT NOT NULL,
    "can_view" BOOLEAN NOT NULL DEFAULT true,
    "can_add" BOOLEAN NOT NULL DEFAULT false,
    "can_edit" BOOLEAN NOT NULL DEFAULT false,
    "can_delete" BOOLEAN NOT NULL DEFAULT false,
    "can_approve" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "role_module_permissions_pkey" PRIMARY KEY ("org_id","role_id","module_key")

);

CREATE TABLE IF NOT EXISTS "access"."user_module_permissions" (

    "org_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "module_key" TEXT NOT NULL,
    "can_view" BOOLEAN,
    "can_add" BOOLEAN,
    "can_edit" BOOLEAN,
    "can_delete" BOOLEAN,
    "can_approve" BOOLEAN,

    CONSTRAINT "user_module_permissions_pkey" PRIMARY KEY ("org_id","user_id","module_key")

);

CREATE TABLE IF NOT EXISTS "access"."team_channels" (

    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'channel',
    "name" TEXT NOT NULL,
    "team_id" TEXT,
    "dm_user_id" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_channels_pkey" PRIMARY KEY ("id")

);

CREATE TABLE IF NOT EXISTS "access"."team_channel_members" (

    "channel_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "last_read_at" TIMESTAMP(3),
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_channel_members_pkey" PRIMARY KEY ("channel_id","user_id")

);

CREATE TABLE IF NOT EXISTS "access"."team_messages" (

    "id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "lead_id" TEXT,
    "assigned_to" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_messages_pkey" PRIMARY KEY ("id")

);

CREATE TABLE IF NOT EXISTS "audit"."audit_logs" (

    "id" TEXT NOT NULL,
    "org_id" TEXT,
    "actor_id" TEXT,
    "module_key" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT,
    "entity_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")

);

CREATE TABLE IF NOT EXISTS "audit"."notifications" (

    "id" TEXT NOT NULL,
    "org_id" TEXT,
    "recipient_id" TEXT,
    "type" "audit"."NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "entity" TEXT,
    "entity_id" TEXT,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")

);

CREATE TABLE IF NOT EXISTS "audit"."support_tickets" (

    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "org_id" TEXT NOT NULL,
    "raised_by_id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "priority" "audit"."SupportTicketPriority" NOT NULL DEFAULT 'normal',
    "status" "audit"."SupportTicketStatus" NOT NULL DEFAULT 'open',
    "closed_at" TIMESTAMP(3),
    "closed_by_id" TEXT,
    "hold_reason" TEXT,
    "held_at" TIMESTAMP(3),
    "held_by_id" TEXT,
    "assigned_to_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")

);

CREATE TABLE IF NOT EXISTS "audit"."support_messages" (

    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "attachment_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_messages_pkey" PRIMARY KEY ("id")

);

CREATE TABLE IF NOT EXISTS "templates"."template_categories" (

    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "tier" "templates"."TemplateTier" NOT NULL DEFAULT 'free',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "template_categories_pkey" PRIMARY KEY ("id")

);

CREATE TABLE IF NOT EXISTS "templates"."templates" (

    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "templates"."TemplateStatus" NOT NULL DEFAULT 'draft',
    "tier" "templates"."TemplateTier" NOT NULL DEFAULT 'free',
    "thumbnail" TEXT,
    "design_id" TEXT NOT NULL,
    "base_design_name" TEXT NOT NULL,
    "category_id" TEXT,
    "kind" "templates"."TemplateKind" NOT NULL DEFAULT 'custom',
    "page_type" "templates"."TemplatePageType" NOT NULL DEFAULT 'landing',
    "parent_id" TEXT,
    "domain" TEXT NOT NULL DEFAULT '',
    "content" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "templates_pkey" PRIMARY KEY ("id")

);

CREATE TABLE IF NOT EXISTS "billing"."plans" (

    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT DEFAULT '',
    "price_monthly" INTEGER NOT NULL,
    "price_yearly" INTEGER NOT NULL,
    "features" JSONB NOT NULL DEFAULT '[]',
    "limits" JSONB,
    "capabilities" JSONB NOT NULL DEFAULT '{}',
    "color" TEXT NOT NULL DEFAULT '#eef0fe',
    "badge" TEXT NOT NULL DEFAULT 'b-indigo',
    "is_popular" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")

);

CREATE TABLE IF NOT EXISTS "billing"."subscriptions" (

    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "billing_cycle" "billing"."BillingCycle" NOT NULL DEFAULT 'monthly',
    "status" "billing"."SubscriptionStatus" NOT NULL DEFAULT 'active',
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "renews_at" TIMESTAMP(3),
    "grace_ends_at" TIMESTAMP(3),
    "mrr" INTEGER,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")

);

CREATE TABLE IF NOT EXISTS "billing"."package_change_requests" (

    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "requested_by_id" TEXT NOT NULL,
    "current_plan_id" TEXT NOT NULL,
    "target_plan_id" TEXT NOT NULL,
    "billing_cycle" "billing"."BillingCycle" NOT NULL DEFAULT 'monthly',
    "status" "billing"."PackageChangeRequestStatus" NOT NULL DEFAULT 'pending',
    "rejection_reason" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "package_change_requests_pkey" PRIMARY KEY ("id")

);

CREATE TABLE IF NOT EXISTS "templates"."organisation_templates" (

    "org_id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" TEXT,

    CONSTRAINT "organisation_templates_pkey" PRIMARY KEY ("org_id","template_id")

);

CREATE TABLE IF NOT EXISTS "templates"."landing_pages" (

    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "team_id" TEXT,
    "source_template_id" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "templates"."LandingPageStatus" NOT NULL DEFAULT 'draft',
    "content" JSONB NOT NULL,
    "thumbnail" TEXT,
    "page_type" "templates"."TemplatePageType" NOT NULL DEFAULT 'landing',
    "parent_id" TEXT,
    "submitted_at" TIMESTAMP(3),
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by_id" TEXT,
    "rejection_reason" TEXT,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "landing_pages_pkey" PRIMARY KEY ("id")

);

CREATE TABLE IF NOT EXISTS "templates"."typography_sets" (

    "id" TEXT NOT NULL,
    "org_id" TEXT,
    "name" TEXT NOT NULL,
    "tokens" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "typography_sets_pkey" PRIMARY KEY ("id")

);

CREATE TABLE IF NOT EXISTS "templates"."lead_forms" (

    "id" TEXT NOT NULL,
    "org_id" TEXT,
    "name" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_forms_pkey" PRIMARY KEY ("id")

);

CREATE TABLE IF NOT EXISTS "templates"."org_domain_requests" (

    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "kind" "templates"."OrgDomainRequestKind" NOT NULL,
    "subdomain" TEXT,
    "custom_domain" TEXT,
    "landing_page_id" TEXT,
    "status" "templates"."OrgDomainRequestStatus" NOT NULL DEFAULT 'pending',
    "requested_by" TEXT,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by" TEXT,
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_domain_requests_pkey" PRIMARY KEY ("id")

);

CREATE TABLE IF NOT EXISTS "templates"."tracking_events" (

    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "landing_page_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tracking_events_pkey" PRIMARY KEY ("id")

);

CREATE TABLE IF NOT EXISTS "templates"."leads" (

    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "landing_page_id" TEXT,
    "project_id" TEXT,
    "form_name" TEXT,
    "source" TEXT DEFAULT 'website',
    "data" JSONB NOT NULL,
    "status" "templates"."LeadStatus" NOT NULL DEFAULT 'new',
    "assigned_to_id" TEXT,
    "next_action_type" TEXT,
    "next_action_at" TIMESTAMP(3),
    "next_action_note" TEXT,
    "reminder_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "alt_name" TEXT,
    "alt_phone" TEXT,
    "whatsapp" TEXT,
    "city" TEXT,
    "budget_min" BIGINT,
    "budget_max" BIGINT,
    "configurations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "purpose" TEXT,
    "financing" TEXT,
    "loan_status" TEXT,
    "timeline_to_buy" TEXT,
    "preferred_floor" TEXT,
    "facing" TEXT,
    "parking" TEXT,
    "requirement_notes" TEXT,
    "campaign" TEXT,
    "utm_source" TEXT,
    "utm_medium" TEXT,
    "utm_campaign" TEXT,
    "temperature" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "consent_whatsapp" BOOLEAN NOT NULL DEFAULT false,
    "consent_call" BOOLEAN NOT NULL DEFAULT false,
    "consent_email" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")

);

CREATE TABLE IF NOT EXISTS "templates"."org_lead_stage_displays" (

    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "status" "templates"."LeadStatus" NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_lead_stage_displays_pkey" PRIMARY KEY ("id")

);

CREATE TABLE IF NOT EXISTS "templates"."call_logs" (

    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "lead_id" TEXT,
    "lead_name" TEXT,
    "direction" "templates"."CallDirection" NOT NULL DEFAULT 'outgoing',
    "outcome" TEXT NOT NULL,
    "duration_seconds" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "call_logs_pkey" PRIMARY KEY ("id")

);

CREATE TABLE IF NOT EXISTS "templates"."activity_events" (

    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "agent_id" TEXT,
    "lead_id" TEXT,
    "type" "templates"."ActivityType" NOT NULL,
    "text" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_events_pkey" PRIMARY KEY ("id")

);

CREATE TABLE IF NOT EXISTS "projects"."projects" (

    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "rera_id" TEXT,
    "possession" TEXT,
    "manager_id" TEXT,
    "status" "projects"."ProjectStatus" NOT NULL DEFAULT 'active',
    "price_min" INTEGER,
    "price_max" INTEGER,
    "base_rate" INTEGER,
    "land_area" DECIMAL(8,2),
    "tower_count" INTEGER,
    "floors_description" TEXT,
    "carpet_range" TEXT,
    "amenities" JSONB NOT NULL DEFAULT '[]',
    "project_type" TEXT,
    "tagline" TEXT,
    "launch_date" TEXT,
    "construction_stage" TEXT,
    "highlights" TEXT,
    "sales_team" TEXT,
    "booking_amount" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "price_includes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "payment_plan" TEXT,
    "offers" TEXT,
    "address_line" TEXT,
    "city" TEXT,
    "locality" TEXT,
    "pincode" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "connectivity" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "landmarks" TEXT,
    "specifications" JSONB,
    "marketing" JSONB,
    "require_booking_approval" BOOLEAN NOT NULL DEFAULT false,
    "visible_to_telecallers" BOOLEAN NOT NULL DEFAULT true,
    "published_to_website" BOOLEAN NOT NULL DEFAULT false,
    "cover_image_url" TEXT,
    "gallery_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "brochure_url" TEXT,
    "rera_certificate_url" TEXT,
    "floor_plan_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")

);

CREATE TABLE IF NOT EXISTS "projects"."project_sales_agents" (

    "project_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_sales_agents_pkey" PRIMARY KEY ("project_id","user_id")

);

CREATE TABLE IF NOT EXISTS "projects"."unit_types" (

    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "carpet_sqft" INTEGER,
    "builtup_sqft" INTEGER,
    "price" INTEGER,
    "total_units" INTEGER NOT NULL DEFAULT 0,
    "floor_plan_url" TEXT,
    "brochure_url" TEXT,
    "video_url" TEXT,
    "gallery_urls" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "unit_types_pkey" PRIMARY KEY ("id")

);

CREATE TABLE IF NOT EXISTS "projects"."units" (

    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "project_id" TEXT,
    "unit_no" TEXT NOT NULL,
    "configuration" TEXT,
    "variant_label" TEXT,
    "carpet_sqft" INTEGER,
    "builtup_sqft" INTEGER,
    "tower" TEXT,
    "floor" INTEGER,
    "facing" TEXT,
    "parking" TEXT,
    "price" INTEGER,
    "address_line" TEXT,
    "owner_name" TEXT,
    "notes" TEXT,
    "floor_plan_url" TEXT,
    "gallery_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "projects"."UnitStatus" NOT NULL DEFAULT 'available',
    "manager_id" TEXT,
    "created_by_id" TEXT,
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")

);

CREATE TABLE IF NOT EXISTS "projects"."unit_sales_agents" (

    "unit_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unit_sales_agents_pkey" PRIMARY KEY ("unit_id","user_id")

);

CREATE TABLE IF NOT EXISTS "projects"."org_catalog_options" (

    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "category" "projects"."OrgCatalogCategory" NOT NULL,
    "label" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_catalog_options_pkey" PRIMARY KEY ("id")

);

CREATE TABLE IF NOT EXISTS "identity"."email_configs" (

    "id" TEXT NOT NULL,
    "org_id" TEXT,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL DEFAULT 587,
    "secure" BOOLEAN NOT NULL DEFAULT false,
    "user" TEXT NOT NULL DEFAULT '',
    "password" TEXT NOT NULL DEFAULT '',
    "from_email" TEXT NOT NULL,
    "from_name" TEXT NOT NULL DEFAULT 'iPixxel Realty',
    "reply_to" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "invite_subject" TEXT,
    "invite_body" TEXT,
    "reset_subject" TEXT,
    "reset_body" TEXT,
    "account_activated_subject" TEXT,
    "account_activated_body" TEXT,
    "account_deactivated_subject" TEXT,
    "account_deactivated_body" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_configs_pkey" PRIMARY KEY ("id")

);

CREATE TABLE IF NOT EXISTS "audit"."email_logs" (

    "id" TEXT NOT NULL,
    "org_id" TEXT,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "template" TEXT,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "metadata" JSONB,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")

);

CREATE TABLE IF NOT EXISTS "identity"."platform_configs" (

    "id" TEXT NOT NULL DEFAULT 'platform',
    "subdomain_mode" TEXT NOT NULL DEFAULT 'production',
    "subdomain_base" TEXT,
    "dns_mode" TEXT NOT NULL DEFAULT 'a',
    "infra_ip" TEXT,
    "infra_ipv6" TEXT,
    "infra_cname" TEXT,
    "infra_ns1" TEXT,
    "infra_ns2" TEXT,
    "billing_expiry_notify_days" INTEGER NOT NULL DEFAULT 3,
    "billing_grace_period_days" INTEGER NOT NULL DEFAULT 7,
    "billing_expiry_behavior" TEXT NOT NULL DEFAULT 'restrict',
    "billing_expiry_message" TEXT NOT NULL DEFAULT 'Your subscription is due for renewal soon. Renew to keep your landing pages and features running without interruption.',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_configs_pkey" PRIMARY KEY ("id")

);

CREATE TABLE IF NOT EXISTS "identity"."media_files" (

    "id" TEXT NOT NULL,
    "org_id" TEXT,
    "uploaded_by_id" TEXT,
    "name" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "stored_key" TEXT NOT NULL,
    "public_url" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'image',
    "folder" TEXT NOT NULL DEFAULT 'general',
    "alt" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_files_pkey" PRIMARY KEY ("id")

);

CREATE UNIQUE INDEX IF NOT EXISTS "org_types_slug_key" ON "identity"."org_types"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "organisations_slug_key" ON "identity"."organisations"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "organisations_subdomain_key" ON "identity"."organisations"("subdomain");
CREATE UNIQUE INDEX IF NOT EXISTS "organisations_custom_domain_key" ON "identity"."organisations"("custom_domain");
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "identity"."users"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "roles_org_id_key_key" ON "identity"."roles"("org_id", "key");
CREATE INDEX IF NOT EXISTS "teams_org_id_idx" ON "access"."teams"("org_id");
CREATE INDEX IF NOT EXISTS "teams_team_lead_id_idx" ON "access"."teams"("team_lead_id");
CREATE INDEX IF NOT EXISTS "team_projects_project_id_idx" ON "access"."team_projects"("project_id");
CREATE INDEX IF NOT EXISTS "role_module_permissions_org_id_role_id_idx" ON "access"."role_module_permissions"("org_id", "role_id");
CREATE INDEX IF NOT EXISTS "user_module_permissions_org_id_user_id_idx" ON "access"."user_module_permissions"("org_id", "user_id");
CREATE INDEX IF NOT EXISTS "team_channels_org_id_idx" ON "access"."team_channels"("org_id");
CREATE INDEX IF NOT EXISTS "team_channels_team_id_idx" ON "access"."team_channels"("team_id");
CREATE INDEX IF NOT EXISTS "team_channel_members_user_id_idx" ON "access"."team_channel_members"("user_id");
CREATE INDEX IF NOT EXISTS "team_messages_channel_id_created_at_idx" ON "access"."team_messages"("channel_id", "created_at");
CREATE INDEX IF NOT EXISTS "team_messages_org_id_idx" ON "access"."team_messages"("org_id");
CREATE INDEX IF NOT EXISTS "notifications_recipient_id_read_at_idx" ON "audit"."notifications"("recipient_id", "read_at");
CREATE INDEX IF NOT EXISTS "notifications_type_idx" ON "audit"."notifications"("type");
CREATE INDEX IF NOT EXISTS "support_tickets_org_id_idx" ON "audit"."support_tickets"("org_id");
CREATE INDEX IF NOT EXISTS "support_tickets_status_idx" ON "audit"."support_tickets"("status");
CREATE INDEX IF NOT EXISTS "support_tickets_assigned_to_id_idx" ON "audit"."support_tickets"("assigned_to_id");
CREATE UNIQUE INDEX IF NOT EXISTS "support_tickets_org_id_number_key" ON "audit"."support_tickets"("org_id", "number");
CREATE INDEX IF NOT EXISTS "support_messages_ticket_id_idx" ON "audit"."support_messages"("ticket_id");
CREATE UNIQUE INDEX IF NOT EXISTS "template_categories_name_key" ON "templates"."template_categories"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "template_categories_slug_key" ON "templates"."template_categories"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "templates_slug_key" ON "templates"."templates"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "plans_slug_key" ON "billing"."plans"("slug");
CREATE INDEX IF NOT EXISTS "subscriptions_org_id_idx" ON "billing"."subscriptions"("org_id");
CREATE INDEX IF NOT EXISTS "subscriptions_plan_id_idx" ON "billing"."subscriptions"("plan_id");
CREATE INDEX IF NOT EXISTS "subscriptions_status_idx" ON "billing"."subscriptions"("status");
CREATE INDEX IF NOT EXISTS "package_change_requests_org_id_idx" ON "billing"."package_change_requests"("org_id");
CREATE INDEX IF NOT EXISTS "package_change_requests_status_idx" ON "billing"."package_change_requests"("status");
CREATE INDEX IF NOT EXISTS "organisation_templates_template_id_idx" ON "templates"."organisation_templates"("template_id");
CREATE INDEX IF NOT EXISTS "landing_pages_org_id_idx" ON "templates"."landing_pages"("org_id");
CREATE INDEX IF NOT EXISTS "landing_pages_status_idx" ON "templates"."landing_pages"("status");
CREATE UNIQUE INDEX IF NOT EXISTS "landing_pages_org_id_slug_key" ON "templates"."landing_pages"("org_id", "slug");
CREATE UNIQUE INDEX IF NOT EXISTS "typography_sets_org_id_name_key" ON "templates"."typography_sets"("org_id", "name");
CREATE INDEX IF NOT EXISTS "lead_forms_org_id_idx" ON "templates"."lead_forms"("org_id");
CREATE INDEX IF NOT EXISTS "lead_forms_updated_at_idx" ON "templates"."lead_forms"("updated_at");
CREATE INDEX IF NOT EXISTS "org_domain_requests_org_id_idx" ON "templates"."org_domain_requests"("org_id");
CREATE INDEX IF NOT EXISTS "org_domain_requests_status_idx" ON "templates"."org_domain_requests"("status");
CREATE INDEX IF NOT EXISTS "tracking_events_org_id_idx" ON "templates"."tracking_events"("org_id");
CREATE INDEX IF NOT EXISTS "tracking_events_landing_page_id_idx" ON "templates"."tracking_events"("landing_page_id");
CREATE INDEX IF NOT EXISTS "tracking_events_event_type_idx" ON "templates"."tracking_events"("event_type");
CREATE INDEX IF NOT EXISTS "leads_org_id_idx" ON "templates"."leads"("org_id");
CREATE INDEX IF NOT EXISTS "leads_landing_page_id_idx" ON "templates"."leads"("landing_page_id");
CREATE INDEX IF NOT EXISTS "leads_project_id_idx" ON "templates"."leads"("project_id");
CREATE INDEX IF NOT EXISTS "leads_assigned_to_id_idx" ON "templates"."leads"("assigned_to_id");
CREATE INDEX IF NOT EXISTS "leads_status_idx" ON "templates"."leads"("status");
CREATE INDEX IF NOT EXISTS "leads_created_at_idx" ON "templates"."leads"("created_at");
CREATE INDEX IF NOT EXISTS "org_lead_stage_displays_org_id_idx" ON "templates"."org_lead_stage_displays"("org_id");
CREATE UNIQUE INDEX IF NOT EXISTS "org_lead_stage_displays_org_id_status_key" ON "templates"."org_lead_stage_displays"("org_id", "status");
CREATE INDEX IF NOT EXISTS "call_logs_org_id_idx" ON "templates"."call_logs"("org_id");
CREATE INDEX IF NOT EXISTS "call_logs_agent_id_idx" ON "templates"."call_logs"("agent_id");
CREATE INDEX IF NOT EXISTS "call_logs_created_at_idx" ON "templates"."call_logs"("created_at");
CREATE INDEX IF NOT EXISTS "activity_events_org_id_idx" ON "templates"."activity_events"("org_id");
CREATE INDEX IF NOT EXISTS "activity_events_agent_id_idx" ON "templates"."activity_events"("agent_id");
CREATE INDEX IF NOT EXISTS "activity_events_created_at_idx" ON "templates"."activity_events"("created_at");
CREATE INDEX IF NOT EXISTS "projects_org_id_idx" ON "projects"."projects"("org_id");
CREATE INDEX IF NOT EXISTS "projects_manager_id_idx" ON "projects"."projects"("manager_id");
CREATE INDEX IF NOT EXISTS "project_sales_agents_user_id_idx" ON "projects"."project_sales_agents"("user_id");
CREATE INDEX IF NOT EXISTS "unit_types_project_id_idx" ON "projects"."unit_types"("project_id");
CREATE INDEX IF NOT EXISTS "units_org_id_idx" ON "projects"."units"("org_id");
CREATE INDEX IF NOT EXISTS "units_project_id_idx" ON "projects"."units"("project_id");
CREATE INDEX IF NOT EXISTS "units_manager_id_idx" ON "projects"."units"("manager_id");
CREATE INDEX IF NOT EXISTS "unit_sales_agents_user_id_idx" ON "projects"."unit_sales_agents"("user_id");
CREATE INDEX IF NOT EXISTS "org_catalog_options_org_id_category_idx" ON "projects"."org_catalog_options"("org_id", "category");
CREATE UNIQUE INDEX IF NOT EXISTS "org_catalog_options_org_id_category_label_key" ON "projects"."org_catalog_options"("org_id", "category", "label");
CREATE UNIQUE INDEX IF NOT EXISTS "email_configs_org_id_key" ON "identity"."email_configs"("org_id");
CREATE INDEX IF NOT EXISTS "email_logs_org_id_idx" ON "audit"."email_logs"("org_id");
CREATE INDEX IF NOT EXISTS "email_logs_to_idx" ON "audit"."email_logs"("to");
CREATE INDEX IF NOT EXISTS "email_logs_status_idx" ON "audit"."email_logs"("status");
CREATE INDEX IF NOT EXISTS "email_logs_sent_at_idx" ON "audit"."email_logs"("sent_at");
CREATE INDEX IF NOT EXISTS "media_files_org_id_idx" ON "identity"."media_files"("org_id");
CREATE INDEX IF NOT EXISTS "media_files_category_idx" ON "identity"."media_files"("category");
CREATE INDEX IF NOT EXISTS "media_files_folder_idx" ON "identity"."media_files"("folder");
CREATE INDEX IF NOT EXISTS "media_files_created_at_idx" ON "identity"."media_files"("created_at");

