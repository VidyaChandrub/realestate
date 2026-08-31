-- Nullable: Organisation is now created at Step 2 (name + subdomain only);
-- city is collected later at Step 3 (Business Details).
ALTER TABLE "identity"."organisations" ALTER COLUMN "city" DROP NOT NULL;
