import { Suspense } from "react";
import { PrestateStudio } from "@/components/prestate/studio";

// No client-side auth guard here, matching /prestate's existing convention —
// every request the builder makes goes through OrgAdminGuard server-side
// (/org/landing-pages/*), so an unauthenticated or wrong-role visitor just
// gets 401/403s from the API rather than a rendered page.
export default function OrgBuilderPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#0c0e14", color: "#8b92a5", padding: 40 }}>Opening builder…</div>}>
      <PrestateStudio resource="landing-page" />
    </Suspense>
  );
}
