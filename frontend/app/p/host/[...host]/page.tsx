import { LocalSitePreview } from "@/components/prestate/live-site";

export default async function DomainPreviewPage({ params }: { params: Promise<{ host: string[] }> }) {
  const { host } = await params;
  return <LocalSitePreview host={host.join(".")} />;
}
