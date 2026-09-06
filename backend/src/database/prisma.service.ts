import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.$connect();
    await this.ensureProductionSchema();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  // Prod often deploys Prisma client ahead of migrations. Login and
  // /org/permissions/me then 500 because a selected column/table is missing.
  private async ensureProductionSchema() {
    const statements = [
      `CREATE SCHEMA IF NOT EXISTS "identity"`,
      `CREATE SCHEMA IF NOT EXISTS "access"`,
      `ALTER TABLE "identity"."users" ADD COLUMN IF NOT EXISTS "email_verified_at" TIMESTAMP(3)`,
      `ALTER TABLE "identity"."users" ADD COLUMN IF NOT EXISTS "onboarding_step" TEXT`,
      `ALTER TABLE "identity"."users" ADD COLUMN IF NOT EXISTS "must_change_password" BOOLEAN NOT NULL DEFAULT false`,
      `DO $$ BEGIN CREATE TYPE "identity"."RoleStatus" AS ENUM ('active', 'inactive'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
      `ALTER TABLE "identity"."roles" ADD COLUMN IF NOT EXISTS "org_id" TEXT`,
      `ALTER TABLE "identity"."roles" ADD COLUMN IF NOT EXISTS "status" "identity"."RoleStatus" NOT NULL DEFAULT 'active'`,
      `ALTER TABLE "identity"."roles" ADD COLUMN IF NOT EXISTS "description" TEXT NOT NULL DEFAULT ''`,
      `ALTER TABLE "identity"."organisations" ADD COLUMN IF NOT EXISTS "custom_domain_landing_page_id" TEXT`,
      `ALTER TABLE "access"."role_module_permissions" ADD COLUMN IF NOT EXISTS "org_id" TEXT NOT NULL DEFAULT 'system'`,
      `ALTER TABLE "access"."role_module_permissions" ADD COLUMN IF NOT EXISTS "can_approve" BOOLEAN NOT NULL DEFAULT false`,
      `CREATE TABLE IF NOT EXISTS "access"."user_module_permissions" (
          "org_id" TEXT NOT NULL,
          "user_id" TEXT NOT NULL,
          "module_key" TEXT NOT NULL,
          "can_view" BOOLEAN,
          "can_add" BOOLEAN,
          "can_edit" BOOLEAN,
          "can_delete" BOOLEAN,
          "can_approve" BOOLEAN,
          CONSTRAINT "user_module_permissions_pkey" PRIMARY KEY ("org_id", "user_id", "module_key")
        )`,
    ];
    for (const sql of statements) {
      try {
        await this.$executeRawUnsafe(sql);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Schema backfill skipped: ${message}`);
      }
    }
  }
}
