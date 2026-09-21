"use client";

import { useCallback, useEffect, useState } from "react";
import { addCommonProjectTypes, getOrgProjectTypes } from "@/lib/api";
import type { OrgCatalogOption, OrgProjectType } from "@/lib/types";

/**
 * Loads the org's project types for a picker, plus the one-click "add common
 * types" action for an org that has none yet (types are never seeded).
 *
 * `options` reshapes the types as catalog options so the shared
 * CatalogOptions chip picker can render them unchanged.
 */
export function useProjectTypes(enabled: boolean) {
  const [types, setTypes] = useState<OrgProjectType[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    getOrgProjectTypes()
      .then((rows) => { if (!cancelled) { setTypes(rows); setError(null); } })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Couldn't load project types.");
      });
    return () => { cancelled = true; };
  }, [enabled]);

  const addCommon = useCallback(async () => {
    setAdding(true);
    try {
      const res = await addCommonProjectTypes();
      setTypes(res.types);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't add the common project types.");
    } finally {
      setAdding(false);
    }
  }, []);

  const options: OrgCatalogOption[] = (types ?? []).map((t) => ({
    id: t.id,
    orgId: t.orgId,
    category: "project_type",
    label: t.name,
    sortOrder: t.sortOrder,
    createdAt: "",
    updatedAt: "",
  }));

  return { types, options, loaded: types !== null, error, adding, addCommon };
}
