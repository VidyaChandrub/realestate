import { headers } from "next/headers";
import { LocalSitePreview } from "@/components/prestate/live-site";
import { resolveOrgSiteHost } from "@/lib/prestate/resolve-host";

export default async function HostSitePage() {
  const h = await headers();
  const host = (h.get("host") ?? "").trim().toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");
  const { page } = await resolveOrgSiteHost(host);
  // Renders the published site for the visited host. Falls back to the local
  // preview store when the backend has no published site for it.
  return <LocalSitePreview host={host} page={page} />;
}
