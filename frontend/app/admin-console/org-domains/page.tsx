"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SuperAdminOrgDomainsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin-console/domains");
  }, [router]);

  return (
    <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
      Redirecting to Domain Requests...
    </div>
  );
}
