"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SuperAdminApprovalsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin-console/organisations");
  }, [router]);

  return null;
}
