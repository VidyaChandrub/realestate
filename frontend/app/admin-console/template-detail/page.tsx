"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** The template manage screen lives at /admin-console/template-detail/[id].
 *  Visiting the bare path just returns to Template Management. */
export default function SuperAdminTemplateDetailIndex() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin-console/templates");
  }, [router]);
  return null;
}
