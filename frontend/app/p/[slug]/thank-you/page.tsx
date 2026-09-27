import { LocalSitePreview } from "@/components/openpage/live-site";

export default async function LocalPreviewThankYouPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <LocalSitePreview slug={`${slug}/thank-you`} />;
}
