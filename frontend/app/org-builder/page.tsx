import { Suspense } from "react";
import { PrestateStudio } from "@/components/prestate/studio";

// No client-side auth guard here, matching /prestate's existing convention —
// every request the builder makes goes through OrgAdminGuard server-side
// (/org/landing-pages/*), so an unauthenticated or wrong-role visitor just
// gets 401/403s from the API rather than a rendered page.
export default function OrgBuilderPage() {
  return (
    <Suspense fallback={<div className="ps-studio-root"><div className="ps-studio-boot">Opening builder…</div></div>}>
      <PrestateStudio resource="landing-page" />
    </Suspense>
  );
}
