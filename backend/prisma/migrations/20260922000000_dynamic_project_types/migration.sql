-- Fully dynamic project types: drop the fixed ProjectLayout structure and the
-- org-level UnitPriceBasis setting, replace UnitType's fixed carpet/built-up/
-- price columns with a generic fieldDefaults JSON blob, collapse Unit's
-- carpet/built-up columns into a single generic `area`, and add
-- Project.areaUnit for price-per-unit-area display.
--
-- Scoped to only the project-types feature's own schema delta. This database
-- also has unrelated pre-existing drift (NotificationType missing a few enum
-- values, templates.templates still carrying dropped columns) from migrations
-- marked applied in _prisma_migrations without actually having run — that is
-- a separate, older issue this migration deliberately does not touch.

-- AlterTable
ALTER TABLE "identity"."organisations" DROP COLUMN "unit_price_basis";

-- AlterTable
ALTER TABLE "projects"."project_type_defs" DROP COLUMN "group_label",
DROP COLUMN "layout";

-- AlterTable
ALTER TABLE "projects"."projects" DROP COLUMN "group_label",
DROP COLUMN "layout",
ADD COLUMN     "area_unit" TEXT NOT NULL DEFAULT 'sqft';

-- AlterTable
ALTER TABLE "projects"."unit_types" DROP COLUMN "builtup_sqft",
DROP COLUMN "carpet_sqft",
DROP COLUMN "price",
ADD COLUMN     "field_defaults" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "projects"."units" DROP COLUMN "builtup_sqft",
DROP COLUMN "carpet_sqft",
ALTER COLUMN "area" SET DATA TYPE DOUBLE PRECISION;

-- DropEnum
DROP TYPE "identity"."UnitPriceBasis";

-- DropEnum
DROP TYPE "projects"."ProjectLayout";
