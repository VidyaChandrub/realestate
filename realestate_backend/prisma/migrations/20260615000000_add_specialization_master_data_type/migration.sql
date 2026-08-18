ALTER TYPE "master_data"."MasterDataCategoryType" ADD VALUE IF NOT EXISTS 'SPECIALIZATION';

CREATE UNIQUE INDEX IF NOT EXISTS "uq_master_data_category_type_parent_value_normalized"
	ON "master_data"."categories" (
		"type",
		COALESCE("parent_id", '00000000-0000-0000-0000-000000000000'::uuid),
		lower(btrim("value"))
	);