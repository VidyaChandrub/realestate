"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { OpenPageStudio } from "@/components/openpage/studio";

// No client-side auth guard here — every request the builder makes goes
// through OrgAdminGuard server-side (/org/landing-pages/*), so an
// unauthenticated or wrong-role visitor just gets 401/403s from the API
// rather than a rendered page.
function OrgBuilderClient() {
  const searchParams = useSearchParams();
  const resource = searchParams.get("scope") === "template" ? "template" : "landing-page";
  return <OpenPageStudio resource={resource} />;
}

export default function OrgBuilderPage() {
  return (
    <Suspense fallback={<div className="ps-studio-root"><div className="ps-studio-boot">Opening builder…</div></div>}>
      <OrgBuilderClient />
    </Suspense>
  );
}