CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "admin";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "ads";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "analytics";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "applications";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "audit";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "employers";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "events";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "jobs";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "master_data";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "notifications";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "scraper";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "users";

-- CreateEnum
CREATE TYPE "users"."UserRole" AS ENUM ('JOB_SEEKER', 'EMPLOYER', 'ADMIN');

-- CreateEnum
CREATE TYPE "users"."PreferredWorkMode" AS ENUM ('REMOTE', 'ONSITE', 'HYBRID');

-- CreateEnum
CREATE TYPE "employers"."OrganizationType" AS ENUM ('PRIVATE', 'PUBLIC', 'STARTUP', 'NGO', 'GOVERNMENT');

-- CreateEnum
CREATE TYPE "employers"."CompanySize" AS ENUM ('1-10', '11-50', '51-200', '201-500', '500+');

-- CreateEnum
CREATE TYPE "employers"."VerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "employers"."EmployerUserStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "employers"."OrganizationRole" AS ENUM ('OWNER', 'HR', 'RECRUITER');

-- CreateEnum
CREATE TYPE "jobs"."JobWorkMode" AS ENUM ('REMOTE', 'ONSITE', 'HYBRID');

-- CreateEnum
CREATE TYPE "jobs"."JobStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED', 'EXPIRED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "jobs"."JobType" AS ENUM ('INTERNAL', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "applications"."ApplicationStatus" AS ENUM ('SUBMITTED', 'VIEWED', 'SHORTLISTED', 'REJECTED', 'HIRED');

-- CreateEnum
CREATE TYPE "ads"."CampaignType" AS ENUM ('IMAGE', 'VIDEO', 'SPONSORED_JOB', 'SPONSORED_EVENT');

-- CreateEnum
CREATE TYPE "ads"."CampaignStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'ACTIVE', 'PAUSED', 'ENDED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ads"."PricingModel" AS ENUM ('CPC', 'CPM', 'TIME_BASED');

-- CreateEnum
CREATE TYPE "ads"."AdEntityType" AS ENUM ('JOB', 'EVENT');

-- CreateEnum
CREATE TYPE "events"."EventMode" AS ENUM ('ONLINE', 'OFFLINE');

-- CreateEnum
CREATE TYPE "events"."EventStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "events"."RegistrationType" AS ENUM ('INTERNAL', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "events"."RegistrationStatus" AS ENUM ('REGISTERED', 'ATTENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "analytics"."AnalyticsEntityType" AS ENUM ('JOB', 'EVENT', 'AD', 'APPLICATION', 'SYSTEM');

-- CreateEnum
CREATE TYPE "notifications"."NotificationType" AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'ERROR', 'JOB_POSTED', 'APPLICATION_RECEIVED', 'STATUS_CHANGED', 'EVENT_REMINDER');

-- CreateEnum
CREATE TYPE "notifications"."EntityType" AS ENUM ('JOB', 'APPLICATION', 'EVENT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "master_data"."MasterDataCategoryType" AS ENUM ('JOB_CATEGORY', 'EVENT_CATEGORY', 'EDUCATION_LEVEL', 'EXPERIENCE_LEVEL', 'EMPLOYMENT_TYPE', 'LOCATION_COUNTRY', 'LOCATION_STATE', 'LOCATION_CITY', 'SKILL', 'INDUSTRY', 'ORGANIZATION_TYPE', 'AD_INTEREST', 'SYSTEM_TAG');

-- CreateEnum
CREATE TYPE "master_data"."MasterStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED', 'EXPIRED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "admin"."ContentPageType" AS ENUM ('PRIVACY', 'HELP_SUPPORT');

-- CreateEnum
CREATE TYPE "ads"."AdPlacement" AS ENUM ('DASHBOARD_BANNER', 'JOB_LISTING', 'SIDEBAR', 'OTHER');

-- CreateEnum
CREATE TYPE "ads"."AdStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'EXPIRED', 'COMPLETED', 'DRAFT');

-- CreateEnum
CREATE TYPE "ads"."AdDisplayType" AS ENUM ('BANNER', 'CARD');

-- CreateEnum
CREATE TYPE "ads"."AdMediaType" AS ENUM ('IMAGE', 'VIDEO', 'HTML');

-- CreateEnum
CREATE TYPE "ads"."AdCtaButtonStyle" AS ENUM ('FILLED', 'OUTLINE', 'GHOST', 'TEXT');

-- CreateEnum
CREATE TYPE "ads"."AdCtaButtonSize" AS ENUM ('SMALL', 'MEDIUM', 'LARGE');

-- CreateEnum
CREATE TYPE "ads"."AdCtaButtonPlacement" AS ENUM ('BOTTOM_LEFT', 'BOTTOM_CENTER', 'BOTTOM_RIGHT', 'TOP_LEFT', 'TOP_CENTER', 'TOP_RIGHT');

-- CreateTable
CREATE TABLE "users"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "mobile_number" TEXT,
    "role" "users"."UserRole" NOT NULL DEFAULT 'JOB_SEEKER',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users"."password_reset_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users"."profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "email" TEXT,
    "full_name" TEXT,
    "first_name" TEXT,
    "last_name" TEXT,
    "phone_number" TEXT,
    "mobile_number" TEXT,
    "gender" TEXT,
    "date_of_birth" DATE,
    "bio" TEXT,
    "avatar_url" TEXT,
    "user_type" TEXT,
    "company_name" TEXT,
    "job_title" TEXT,
    "current_city_id" UUID,
    "state_id" UUID,
    "country_id" UUID,
    "pincode" TEXT,
    "nationality" TEXT,
    "highest_qualification_id" UUID,
    "current_job_title" TEXT,
    "current_company_name" TEXT,
    "experience_level_id" UUID,
    "total_experience_months" INTEGER NOT NULL DEFAULT 0,
    "relevant_experience_months" INTEGER,
    "profile_complete" BOOLEAN NOT NULL DEFAULT false,
    "profile_completion_percentage" INTEGER NOT NULL DEFAULT 0,
    "preferred_employment_type_id" UUID,
    "preferred_work_mode" "users"."PreferredWorkMode",
    "preferred_category_ids" UUID[] DEFAULT ARRAY[]::UUID[],
    "preferred_interest_ids" UUID[] DEFAULT ARRAY[]::UUID[],
    "available_joining_date" DATE,
    "shift_preference" TEXT,
    "languages_known" JSONB,
    "linkedin_profile_url" TEXT,
    "disability_info" TEXT,
    "diversity_info" TEXT,
    "father_mother_name" TEXT,
    "permanent_address" TEXT,
    "preferences" JSONB DEFAULT '{}',
    "notification_settings" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "embedding" vector(1536),
    "last_login_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users"."education_details" (
    "id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "highest_qualification_id" UUID NOT NULL,
    "degree_name" TEXT NOT NULL,
    "specialization" TEXT,
    "university_name" TEXT NOT NULL,
    "year_of_passing" INTEGER NOT NULL,
    "percentage" TEXT,

    CONSTRAINT "education_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users"."professional_experiences" (
    "id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "job_title" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "years_of_experience" INTEGER NOT NULL,
    "months_of_experience" INTEGER NOT NULL,
    "relevant_years" INTEGER,
    "relevant_months" INTEGER,
    "employment_status" TEXT NOT NULL,
    "notice_period" TEXT,
    "current_salary" DOUBLE PRECISION,
    "expected_salary" DOUBLE PRECISION,
    "willingness_to_relocate" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "professional_experiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users"."user_preferred_locations" (
    "id" UUID NOT NULL,
    "profile_id" TEXT NOT NULL,
    "location_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_preferred_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users"."user_skills" (
    "id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "master_data_id" UUID,
    "type" TEXT NOT NULL DEFAULT 'PRIMARY',
    "years_of_experience" DOUBLE PRECISION,
    "certification" TEXT,

    CONSTRAINT "user_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users"."user_documents" (
    "id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scraper"."job_configurations" (
    "id" SERIAL NOT NULL,
    "job_title" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "experience" TEXT,
    "skills" TEXT,

    CONSTRAINT "job_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scraper"."job_links" (
    "id" SERIAL NOT NULL,
    "link" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'created',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scraper"."job_details" (
    "id" SERIAL NOT NULL,
    "job_link_id" INTEGER NOT NULL,
    "company" TEXT,
    "background_image" TEXT,
    "job_title" TEXT,
    "country" TEXT,
    "state" TEXT,
    "city" TEXT,
    "description" TEXT,
    "summary" VARCHAR(150),
    "seniority" TEXT,
    "employment_type" TEXT,
    "applicants" INTEGER,
    "requirements" TEXT[],
    "education_qualifications" TEXT[],
    "experience_level" TEXT,
    "salary" TEXT,
    "scrapped" JSONB,
    "status" VARCHAR NOT NULL DEFAULT 'CREATED',
    "published_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employers"."organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "industry" TEXT,
    "logoUrl" TEXT,
    "cover_image_url" TEXT,
    "gallery_images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "website" TEXT,
    "founded_year" INTEGER,
    "company_size" "employers"."CompanySize",
    "type" "employers"."OrganizationType",
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "country" TEXT,
    "state" TEXT,
    "city" TEXT,
    "address" TEXT,
    "postal_code" TEXT,
    "mission" TEXT,
    "vision" TEXT,
    "culture_description" TEXT,
    "benefits" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "verification_status" "employers"."VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "featured_until" TIMESTAMP(3),
    "subscription_plan_id" TEXT,
    "jobs_count" INTEGER NOT NULL DEFAULT 0,
    "employees_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "is_approved" BOOLEAN NOT NULL DEFAULT false,
    "is_suspended" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employers"."employers" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "email" TEXT NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employers"."employer_users" (
    "id" TEXT NOT NULL,
    "employer_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "role" "employers"."OrganizationRole" NOT NULL,
    "status" "employers"."EmployerUserStatus" NOT NULL DEFAULT 'INVITED',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "invited_by_id" TEXT,
    "invited_at" TIMESTAMP(3),
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "employer_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs"."jobs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "organization_name" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "summary" TEXT,
    "category_id" UUID,
    "location_id" UUID,
    "min_experience_months" INTEGER,
    "max_experience_months" INTEGER,
    "experience_level_id" UUID,
    "education_level_id" UUID,
    "work_mode" "jobs"."JobWorkMode",
    "salary_min" INTEGER,
    "salary_max" INTEGER,
    "employment_type_id" UUID,
    "job_type" "jobs"."JobType" NOT NULL DEFAULT 'INTERNAL',
    "external_url" TEXT,
    "status" "jobs"."JobStatus" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "backgroundImage" TEXT,
    "embedding" vector(1536),
    "keywords" tsvector,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs"."job_skills" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "master_data_id" UUID,

    CONSTRAINT "job_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs"."job_educations" (
    "job_id" TEXT NOT NULL,
    "education_id" UUID NOT NULL,

    CONSTRAINT "job_educations_pkey" PRIMARY KEY ("job_id","education_id")
);

-- CreateTable
CREATE TABLE "applications"."applications" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "cover_note" TEXT,
    "status" "applications"."ApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "applied_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications"."saved_jobs" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ads"."campaigns" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ads"."CampaignType" NOT NULL,
    "entity_type" "ads"."AdEntityType",
    "entity_id" TEXT,
    "pricing_model" "ads"."PricingModel" NOT NULL,
    "status" "ads"."CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "budget_total" DECIMAL(14,4) NOT NULL,
    "budget_spent" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "cost_per_click" DECIMAL(10,4),
    "cost_per_thousand_impressions" DECIMAL(10,4),
    "flat_fee" DECIMAL(14,4),
    "daily_limit" DECIMAL(14,4),
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "boost_score" INTEGER NOT NULL DEFAULT 0,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ads"."creatives" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "media_url" TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "headline" TEXT NOT NULL,
    "description" TEXT,
    "cta_text" TEXT NOT NULL,
    "cta_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creatives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ads"."targeting_rules" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "country_ids" UUID[] DEFAULT ARRAY[]::UUID[],
    "state_ids" UUID[] DEFAULT ARRAY[]::UUID[],
    "city_ids" UUID[] DEFAULT ARRAY[]::UUID[],
    "education_level_ids" UUID[] DEFAULT ARRAY[]::UUID[],
    "experience_level_ids" UUID[] DEFAULT ARRAY[]::UUID[],
    "interest_ids" UUID[] DEFAULT ARRAY[]::UUID[],
    "demographic_extensions" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "targeting_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ads"."delivery_stats" (
    "campaign_id" TEXT NOT NULL,
    "impressions" BIGINT NOT NULL DEFAULT 0,
    "clicks" BIGINT NOT NULL DEFAULT 0,
    "video_completions" BIGINT NOT NULL DEFAULT 0,
    "last_updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_stats_pkey" PRIMARY KEY ("campaign_id")
);

-- CreateTable
CREATE TABLE "events"."events" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category_id" UUID,
    "mode" "events"."EventMode" NOT NULL DEFAULT 'ONLINE',
    "location_id" UUID,
    "meeting_url" TEXT,
    "is_meeting_url_published" BOOLEAN NOT NULL DEFAULT false,
    "registration_type" "events"."RegistrationType" NOT NULL DEFAULT 'INTERNAL',
    "external_registration_url" TEXT,
    "capacity" INTEGER,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "status" "events"."EventStatus" NOT NULL DEFAULT 'DRAFT',
    "banner_image" TEXT,
    "tag_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "keywords" tsvector,
    "embedding" vector(1536),
    "is_free" BOOLEAN NOT NULL DEFAULT true,
    "price" DECIMAL(10,2),
    "is_sponsored" BOOLEAN NOT NULL DEFAULT false,
    "sponsor_campaign_id" TEXT,
    "boost_score" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events"."event_registrations" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "events"."RegistrationStatus" NOT NULL DEFAULT 'REGISTERED',
    "registered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events"."event_external_clicks" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "clicked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_external_clicks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics"."analytics_events" (
    "id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "user_id" TEXT,
    "organization_id" TEXT,
    "entity_type" "analytics"."AnalyticsEntityType" NOT NULL,
    "entity_id" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id","created_at")
);

-- CreateTable
CREATE TABLE "analytics"."analytics_event_dedup" (
    "ingestion_key" TEXT NOT NULL,
    "analytics_event_id" UUID,
    "processed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT "analytics_event_dedup_pkey" PRIMARY KEY ("ingestion_key")
);

-- CreateTable
CREATE TABLE "analytics"."campaign_metrics" (
    "campaign_id" UUID NOT NULL,
    "impressions" BIGINT NOT NULL DEFAULT 0,
    "clicks" BIGINT NOT NULL DEFAULT 0,
    "video_completions" BIGINT NOT NULL DEFAULT 0,
    "spend" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "last_updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_metrics_pkey" PRIMARY KEY ("campaign_id")
);

-- CreateTable
CREATE TABLE "analytics"."job_metrics" (
    "job_id" UUID NOT NULL,
    "views" BIGINT NOT NULL DEFAULT 0,
    "applications" BIGINT NOT NULL DEFAULT 0,
    "last_updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_metrics_pkey" PRIMARY KEY ("job_id")
);

-- CreateTable
CREATE TABLE "analytics"."event_metrics" (
    "event_id" UUID NOT NULL,
    "views" BIGINT NOT NULL DEFAULT 0,
    "registrations" BIGINT NOT NULL DEFAULT 0,
    "external_registration_clicks" BIGINT NOT NULL DEFAULT 0,
    "last_updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_metrics_pkey" PRIMARY KEY ("event_id")
);

-- CreateTable
CREATE TABLE "analytics"."user_engagement_summary" (
    "user_id" TEXT NOT NULL,
    "total_sessions" BIGINT NOT NULL DEFAULT 0,
    "total_clicks" BIGINT NOT NULL DEFAULT 0,
    "total_applications" BIGINT NOT NULL DEFAULT 0,
    "last_active_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_engagement_summary_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "analytics"."user_seen_feed" (
    "user_id" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "entity_type" TEXT NOT NULL,
    "seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_seen_feed_pkey" PRIMARY KEY ("user_id","entity_id")
);

-- CreateTable
CREATE TABLE "notifications"."notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "notifications"."NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "entity_type" "notifications"."EntityType" NOT NULL,
    "entity_id" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_data"."categories" (
    "id" UUID NOT NULL,
    "type" "master_data"."MasterDataCategoryType" NOT NULL,
    "value" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "parent_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "status" "master_data"."MasterStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit"."audit_logs" (
    "id" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "action" TEXT,
    "performed_by" TEXT,
    "old_value" JSONB,
    "new_value" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin"."moderation_logs" (
    "id" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "action" TEXT,
    "admin_user_id" TEXT,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moderation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin"."content_pages" (
    "id" TEXT NOT NULL,
    "type" "admin"."ContentPageType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ads"."advertisements" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "redirect_url" TEXT,
    "cta_text" TEXT,
    "cta_text_color" TEXT,
    "cta_button_style" "ads"."AdCtaButtonStyle",
    "cta_button_size" "ads"."AdCtaButtonSize",
    "cta_button_placement" "ads"."AdCtaButtonPlacement",
    "cta_background_color" TEXT,
    "start_date_time" TIMESTAMP(3) NOT NULL,
    "end_date_time" TIMESTAMP(3) NOT NULL,
    "placement" "ads"."AdPlacement" NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "status" "ads"."AdStatus" NOT NULL DEFAULT 'ACTIVE',
    "display_type" "ads"."AdDisplayType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "advertisements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ads"."advertisement_targeting" (
    "id" TEXT NOT NULL,
    "advertisement_id" TEXT NOT NULL,
    "country_ids" UUID[] DEFAULT ARRAY[]::UUID[],
    "state_ids" UUID[] DEFAULT ARRAY[]::UUID[],
    "city_ids" UUID[] DEFAULT ARRAY[]::UUID[],
    "skill_ids" UUID[] DEFAULT ARRAY[]::UUID[],
    "experience_level_ids" UUID[] DEFAULT ARRAY[]::UUID[],
    "education_level_ids" UUID[] DEFAULT ARRAY[]::UUID[],
    "year_of_passing" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "advertisement_targeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ads"."advertisement_clicks" (
    "id" TEXT NOT NULL,
    "advertisement_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "user_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "mobile_number" TEXT,
    "location_id" UUID,
    "skill_ids" UUID[] DEFAULT ARRAY[]::UUID[],
    "experience_level_id" UUID,
    "education_level_id" UUID,
    "clicked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "advertisement_clicks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ads"."advertisement_media" (
    "id" TEXT NOT NULL,
    "advertisement_id" TEXT NOT NULL,
    "media_url" TEXT NOT NULL,
    "media_type" "ads"."AdMediaType" NOT NULL DEFAULT 'IMAGE',
    "order" INTEGER NOT NULL DEFAULT 0,
    "thumbnail_url" TEXT,
    "alt_text" TEXT,
    "created_by" TEXT NOT NULL,
    "modified_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "advertisement_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_data"."roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_data"."menus" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "group_label" TEXT,
    "parent_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "menus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_data"."role_permissions" (
    "id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "menu_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"."users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "users"."password_reset_tokens"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_user_id_key" ON "users"."profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_email_key" ON "users"."profiles"("email");

-- CreateIndex
CREATE INDEX "profiles_current_city_id_idx" ON "users"."profiles"("current_city_id");

-- CreateIndex
CREATE INDEX "profiles_state_id_idx" ON "users"."profiles"("state_id");

-- CreateIndex
CREATE INDEX "profiles_country_id_idx" ON "users"."profiles"("country_id");

-- CreateIndex
CREATE INDEX "profiles_highest_qualification_id_idx" ON "users"."profiles"("highest_qualification_id");

-- CreateIndex
CREATE INDEX "profiles_experience_level_id_idx" ON "users"."profiles"("experience_level_id");

-- CreateIndex
CREATE INDEX "profiles_preferred_employment_type_id_idx" ON "users"."profiles"("preferred_employment_type_id");

-- CreateIndex
CREATE INDEX "profiles_total_experience_months_idx" ON "users"."profiles"("total_experience_months");

-- CreateIndex
CREATE INDEX "profiles_relevant_experience_months_idx" ON "users"."profiles"("relevant_experience_months");

-- CreateIndex
CREATE INDEX "profiles_current_city_id_experience_level_id_idx" ON "users"."profiles"("current_city_id", "experience_level_id");

-- CreateIndex
CREATE INDEX "profiles_preferred_category_ids_idx" ON "users"."profiles" USING GIN ("preferred_category_ids");

-- CreateIndex
CREATE INDEX "profiles_preferred_interest_ids_idx" ON "users"."profiles" USING GIN ("preferred_interest_ids");

-- CreateIndex
CREATE INDEX "user_preferred_locations_profile_id_idx" ON "users"."user_preferred_locations"("profile_id");

-- CreateIndex
CREATE INDEX "user_preferred_locations_location_id_idx" ON "users"."user_preferred_locations"("location_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_preferred_locations_profile_id_location_id_key" ON "users"."user_preferred_locations"("profile_id", "location_id");

-- CreateIndex
CREATE UNIQUE INDEX "job_details_job_link_id_key" ON "scraper"."job_details"("job_link_id");

-- CreateIndex
CREATE UNIQUE INDEX "employers_user_id_key" ON "employers"."employers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "employers_email_key" ON "employers"."employers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "employer_users_employer_id_organization_id_key" ON "employers"."employer_users"("employer_id", "organization_id");

-- CreateIndex
CREATE INDEX "jobs_status_idx" ON "jobs"."jobs"("status");

-- CreateIndex
CREATE INDEX "jobs_education_level_id_idx" ON "jobs"."jobs"("education_level_id");

-- CreateIndex
CREATE INDEX "jobs_category_id_idx" ON "jobs"."jobs"("category_id");

-- CreateIndex
CREATE INDEX "jobs_location_id_idx" ON "jobs"."jobs"("location_id");

-- CreateIndex
CREATE INDEX "jobs_experience_level_id_idx" ON "jobs"."jobs"("experience_level_id");

-- CreateIndex
CREATE INDEX "jobs_employment_type_id_idx" ON "jobs"."jobs"("employment_type_id");

-- CreateIndex
CREATE INDEX "jobs_status_expires_at_idx" ON "jobs"."jobs"("status", "expires_at");

-- CreateIndex
CREATE INDEX "jobs_location_id_status_idx" ON "jobs"."jobs"("location_id", "status");

-- CreateIndex
CREATE INDEX "jobs_min_experience_months_max_experience_months_idx" ON "jobs"."jobs"("min_experience_months", "max_experience_months");

-- CreateIndex
CREATE INDEX "jobs_keywords_idx" ON "jobs"."jobs" USING GIN ("keywords");

-- CreateIndex
CREATE INDEX "job_skills_job_id_idx" ON "jobs"."job_skills"("job_id");

-- CreateIndex
CREATE INDEX "job_skills_master_data_id_idx" ON "jobs"."job_skills"("master_data_id");

-- CreateIndex
CREATE INDEX "job_educations_education_id_idx" ON "jobs"."job_educations"("education_id");

-- CreateIndex
CREATE UNIQUE INDEX "applications_job_id_user_id_key" ON "applications"."applications"("job_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "saved_jobs_job_id_user_id_key" ON "applications"."saved_jobs"("job_id", "user_id");

-- CreateIndex
CREATE INDEX "idx_campaigns_org_id" ON "ads"."campaigns"("organization_id");

-- CreateIndex
CREATE INDEX "idx_campaigns_status" ON "ads"."campaigns"("status");

-- CreateIndex
CREATE INDEX "idx_campaigns_start_date" ON "ads"."campaigns"("start_date");

-- CreateIndex
CREATE INDEX "idx_campaigns_end_date" ON "ads"."campaigns"("end_date");

-- CreateIndex
CREATE INDEX "idx_creatives_campaign_id" ON "ads"."creatives"("campaign_id");

-- CreateIndex
CREATE UNIQUE INDEX "targeting_rules_campaign_id_key" ON "ads"."targeting_rules"("campaign_id");

-- CreateIndex
CREATE INDEX "events_organization_id_idx" ON "events"."events"("organization_id");

-- CreateIndex
CREATE INDEX "events_status_idx" ON "events"."events"("status");

-- CreateIndex
CREATE INDEX "events_start_date_idx" ON "events"."events"("start_date");

-- CreateIndex
CREATE INDEX "events_category_id_idx" ON "events"."events"("category_id");

-- CreateIndex
CREATE INDEX "events_location_id_idx" ON "events"."events"("location_id");

-- CreateIndex
CREATE INDEX "event_registrations_event_id_idx" ON "events"."event_registrations"("event_id");

-- CreateIndex
CREATE INDEX "event_registrations_user_id_idx" ON "events"."event_registrations"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_registrations_event_id_user_id_key" ON "events"."event_registrations"("event_id", "user_id");

-- CreateIndex
CREATE INDEX "event_external_clicks_event_id_idx" ON "events"."event_external_clicks"("event_id");

-- CreateIndex
CREATE INDEX "event_external_clicks_user_id_idx" ON "events"."event_external_clicks"("user_id");

-- CreateIndex
CREATE INDEX "idx_analytics_events_created_at" ON "analytics"."analytics_events"("created_at");

-- CreateIndex
CREATE INDEX "idx_analytics_events_event_type" ON "analytics"."analytics_events"("event_type");

-- CreateIndex
CREATE INDEX "idx_analytics_events_user_id" ON "analytics"."analytics_events"("user_id");

-- CreateIndex
CREATE INDEX "idx_analytics_events_organization_id" ON "analytics"."analytics_events"("organization_id");

-- CreateIndex
CREATE INDEX "idx_user_seen_feed_user_id" ON "analytics"."user_seen_feed"("user_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"."notifications"("user_id");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"."notifications"("created_at");

-- CreateIndex
CREATE INDEX "categories_type_idx" ON "master_data"."categories"("type");

-- CreateIndex
CREATE INDEX "categories_slug_idx" ON "master_data"."categories"("slug");

-- CreateIndex
CREATE INDEX "categories_parent_id_idx" ON "master_data"."categories"("parent_id");

-- CreateIndex
CREATE INDEX "categories_is_active_idx" ON "master_data"."categories"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "uq_master_data_category_type_slug" ON "master_data"."categories"("type", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "content_pages_type_key" ON "admin"."content_pages"("type");

-- CreateIndex
CREATE INDEX "advertisements_organization_id_idx" ON "ads"."advertisements"("organization_id");

-- CreateIndex
CREATE INDEX "advertisements_user_id_idx" ON "ads"."advertisements"("user_id");

-- CreateIndex
CREATE INDEX "advertisement_targeting_advertisement_id_idx" ON "ads"."advertisement_targeting"("advertisement_id");

-- CreateIndex
CREATE INDEX "advertisement_clicks_advertisement_id_idx" ON "ads"."advertisement_clicks"("advertisement_id");

-- CreateIndex
CREATE INDEX "advertisement_clicks_user_id_idx" ON "ads"."advertisement_clicks"("user_id");

-- CreateIndex
CREATE INDEX "advertisement_media_advertisement_id_idx" ON "ads"."advertisement_media"("advertisement_id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "master_data"."roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "uq_role_menu" ON "master_data"."role_permissions"("role_id", "menu_id");

-- AddForeignKey
ALTER TABLE "users"."education_details" ADD CONSTRAINT "education_details_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "users"."profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users"."professional_experiences" ADD CONSTRAINT "professional_experiences_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "users"."profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users"."user_preferred_locations" ADD CONSTRAINT "user_preferred_locations_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "users"."profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users"."user_skills" ADD CONSTRAINT "user_skills_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "users"."profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users"."user_documents" ADD CONSTRAINT "user_documents_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "users"."profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scraper"."job_details" ADD CONSTRAINT "job_details_job_link_id_fkey" FOREIGN KEY ("job_link_id") REFERENCES "scraper"."job_links"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employers"."employer_users" ADD CONSTRAINT "employer_users_employer_id_fkey" FOREIGN KEY ("employer_id") REFERENCES "employers"."employers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employers"."employer_users" ADD CONSTRAINT "employer_users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "employers"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs"."jobs" ADD CONSTRAINT "jobs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "employers"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs"."jobs" ADD CONSTRAINT "jobs_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "master_data"."categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs"."jobs" ADD CONSTRAINT "jobs_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "master_data"."categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs"."jobs" ADD CONSTRAINT "jobs_experience_level_id_fkey" FOREIGN KEY ("experience_level_id") REFERENCES "master_data"."categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs"."jobs" ADD CONSTRAINT "jobs_employment_type_id_fkey" FOREIGN KEY ("employment_type_id") REFERENCES "master_data"."categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs"."jobs" ADD CONSTRAINT "jobs_education_level_id_fkey" FOREIGN KEY ("education_level_id") REFERENCES "master_data"."categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs"."job_skills" ADD CONSTRAINT "job_skills_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"."jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs"."job_skills" ADD CONSTRAINT "job_skills_master_data_id_fkey" FOREIGN KEY ("master_data_id") REFERENCES "master_data"."categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs"."job_educations" ADD CONSTRAINT "job_educations_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"."jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs"."job_educations" ADD CONSTRAINT "job_educations_education_id_fkey" FOREIGN KEY ("education_id") REFERENCES "master_data"."categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications"."applications" ADD CONSTRAINT "applications_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"."jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications"."applications" ADD CONSTRAINT "applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"."profiles"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications"."saved_jobs" ADD CONSTRAINT "saved_jobs_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"."jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications"."saved_jobs" ADD CONSTRAINT "saved_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"."profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ads"."campaigns" ADD CONSTRAINT "campaigns_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "employers"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ads"."creatives" ADD CONSTRAINT "creatives_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "ads"."campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ads"."targeting_rules" ADD CONSTRAINT "targeting_rules_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "ads"."campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ads"."delivery_stats" ADD CONSTRAINT "delivery_stats_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "ads"."campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events"."events" ADD CONSTRAINT "events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "employers"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events"."event_registrations" ADD CONSTRAINT "event_registrations_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"."events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events"."event_registrations" ADD CONSTRAINT "event_registrations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"."profiles"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events"."event_external_clicks" ADD CONSTRAINT "event_external_clicks_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"."events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events"."event_external_clicks" ADD CONSTRAINT "event_external_clicks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"."profiles"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_data"."categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "master_data"."categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ads"."advertisements" ADD CONSTRAINT "advertisements_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "employers"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ads"."advertisements" ADD CONSTRAINT "advertisements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"."profiles"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ads"."advertisement_targeting" ADD CONSTRAINT "advertisement_targeting_advertisement_id_fkey" FOREIGN KEY ("advertisement_id") REFERENCES "ads"."advertisements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ads"."advertisement_clicks" ADD CONSTRAINT "advertisement_clicks_advertisement_id_fkey" FOREIGN KEY ("advertisement_id") REFERENCES "ads"."advertisements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ads"."advertisement_clicks" ADD CONSTRAINT "advertisement_clicks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"."profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ads"."advertisement_media" ADD CONSTRAINT "advertisement_media_advertisement_id_fkey" FOREIGN KEY ("advertisement_id") REFERENCES "ads"."advertisements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_data"."menus" ADD CONSTRAINT "menus_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "master_data"."menus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_data"."role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "master_data"."roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_data"."role_permissions" ADD CONSTRAINT "role_permissions_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "master_data"."menus"("id") ON DELETE CASCADE ON UPDATE CASCADE;
