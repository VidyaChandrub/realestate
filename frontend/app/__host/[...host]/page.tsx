import { LocalSitePreview } from "@/components/prestate/live-site";
import { resolveOrgSiteHost } from "@/lib/prestate/resolve-host";

export default async function DomainPreviewPage({ params }: { params: Promise<{ host: string[] }> }) {
  const { host } = await params;
  const hostString = host.join(".");
  const { page } = await resolveOrgSiteHost(hostString);
  // Explicit hostname preview (used by the builder for a page's assigned
  // domain). The live subdomain is served via /__site instead.
  return <LocalSitePreview host={hostString} page={page} />;
}
