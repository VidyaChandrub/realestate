import { LocalSitePreview } from "@/components/prestate/live-site";

export default async function LocalPreviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <LocalSitePreview slug={slug} />;
}
