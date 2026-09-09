"use client";

import { useEffect, useRef } from "react";
import { useConfigStore } from "@/components/openpage/store/configStore";
import { landingPageFromSite, siteFromLandingPage } from "@/lib/openpage/content";
import type { LandingPageData } from "@/lib/prestate/types";

export function OpenPageBridge({
  page,
  onPersist,
}: {
  page: LandingPageData;
  onPersist: (next: LandingPageData) => void;
}) {
  const pageRef = useRef(page);
  pageRef.current = page;
  const skip = useRef(true);

  useEffect(() => {
    skip.current = true;
    const site = siteFromLandingPage(page);
    useConfigStore.getState().setConfig(site);
    const emptyStored = !page.openPageSite || !(page.openPageSite.blocks?.length || page.openPageSite.pages?.[0]?.blocks?.length);
    if (emptyStored && site.blocks.length) {
      onPersist(landingPageFromSite(page, site));
    }
    const t = setTimeout(() => {
      skip.current = false;
    }, 50);
    return () => clearTimeout(t);
  }, [page.id]);

  useEffect(() => {
    return useConfigStore.subscribe((state, prev) => {
      if (skip.current) return;
      if (state.config === prev.config) return;
      onPersist(landingPageFromSite(pageRef.current, state.config));
    });
  }, [onPersist]);

  return null;
}
