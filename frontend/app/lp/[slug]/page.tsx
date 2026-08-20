import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LpPageRenderer, FontLinks } from "@/components/lp/page";
import { TrackingScripts } from "@/components/lp/tracking";
import type { LpPage } from "@/lib/lp-types";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:5000";

async function getPage(slug: string): Promise<LpPage | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/public/pages/${slug}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as LpPage;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page) return { title: "Not Found" };

  const seo = page.seo;
  const title = seo?.title ?? page.name;
  const description = seo?.description ?? page.description ?? "";
  const canonical = seo?.canonical ?? undefined;

  return {
    title,
    description,
    ...(canonical ? { alternates: { canonical } } : {}),
    ...(seo?.robots ? { robots: seo.robots as never } : {}),
    openGraph: {
      title: seo?.ogTitle ?? title,
      description: seo?.ogDescription ?? description,
      images: seo?.ogImage ? [seo.ogImage] : [],
      type: "website",
    },
    icons: seo?.favicon ? { icon: seo.favicon } : undefined,
  };
}

export default async function PublicLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page) notFound();

  const seo = page.seo;

  return (
    <>
      <FontLinks fonts={page.document?.settings?.fonts} />
      <TrackingScripts config={page.tracking} />
      {seo?.schema ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: seo.schema }}
        />
      ) : null}
      <LpPageRenderer document={page.document} page={page} />
    </>
  );
}