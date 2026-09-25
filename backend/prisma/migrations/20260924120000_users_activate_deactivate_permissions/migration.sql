-- Users module: split the old "Approve" permission (which gated both
-- approve/activate and disapprove/deactivate) into separate Activate and
-- Deactivate permissions. Approve no longer applies to Users.
ALTER TABLE "access"."role_module_permissions"
  ADD COLUMN IF NOT EXISTS "can_activate" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "can_deactivate" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "access"."user_module_permissions"
  ADD COLUMN IF NOT EXISTS "can_activate" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "can_deactivate" BOOLEAN;

-- Carry every existing Users > Approve grant over to both new actions so no
-- one loses access, then clear the retired Approve flag.
UPDATE "access"."role_module_permissions"
SET "can_activate" = true, "can_deactivate" = true, "can_approve" = false
WHERE "module_key" = 'users' AND "can_approve" = true;

UPDATE "access"."user_module_permissions"
SET "can_activate" = "can_approve", "can_deactivate" = "can_approve", "can_approve" = NULL
WHERE "module_key" = 'users' AND "can_approve" IS NOT NULL;
