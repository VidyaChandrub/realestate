-- Unit variant becomes an org-managed catalog, like facing and parking.
ALTER TYPE "projects"."OrgCatalogCategory" ADD VALUE 'unit_variant';

-- Org-level denominator for every "₹ x / sqft" figure. Carpet is the RERA
-- standard and stays the default, so existing orgs are unaffected.
CREATE TYPE "identity"."UnitPriceBasis" AS ENUM ('carpet', 'builtup');
ALTER TABLE "identity"."organisations"
  ADD COLUMN "unit_price_basis" "identity"."UnitPriceBasis" NOT NULL DEFAULT 'carpet';

-- Who created / last touched a unit. Nullable: rows written before these
-- columns have no actor. ON DELETE SET NULL so removing a user never removes
-- their units.
ALTER TABLE "projects"."units"
  ADD COLUMN "created_by_id" TEXT,
  ADD COLUMN "updated_by_id" TEXT;

ALTER TABLE "projects"."units"
  ADD CONSTRAINT "units_created_by_id_fkey" FOREIGN KEY ("created_by_id")
    REFERENCES "identity"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "units_updated_by_id_fkey" FOREIGN KEY ("updated_by_id")
    REFERENCES "identity"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
