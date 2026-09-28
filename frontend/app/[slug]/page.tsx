import { notFound } from "next/navigation";
import { LocalSitePreview } from "@/components/openpage/live-site";

const RESERVED_SLUGS = new Set([
  "login",
  "register",
  "org",
  "admin",
  "admin-console",
  "admin-login",
  "change-password",
  "forgot-password",
  "org-site",
  "preview",
  "p",
  "embed",
  "api",
]);

export default async function DirectSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (RESERVED_SLUGS.has(slug.toLowerCase())) {
    notFound();
  }
  return <LocalSitePreview slug={slug} publicLive />;
}
