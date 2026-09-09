"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { findFormById, type FormDefinition } from "@/lib/prestate/forms-store";
import type { PopupConfig } from "@/components/openpage/blocks/types";
import { DynamicLeadForm } from "@/components/prestate/dynamic-lead-form";
import { X } from "lucide-react";

export interface OpenPageRuntimeValue {
  live: boolean;
  pageId?: string;
  projectName?: string;
  forms: FormDefinition[];
  popups: PopupConfig[];
  openPopup: (popupId?: string, extra?: { brochureUrl?: string }) => void;
  closePopup: () => void;
}

const RuntimeContext = createContext<OpenPageRuntimeValue>({
  live: false,
  forms: [],
  popups: [],
  openPopup: () => {},
  closePopup: () => {},
});

export function useOpenPageRuntime() {
  return useContext(RuntimeContext);
}

export function OpenPageRuntimeProvider({
  children,
  live,
  pageId,
  projectName,
  forms,
  popups,
}: {
  children: ReactNode;
  live: boolean;
  pageId?: string;
  projectName?: string;
  forms: FormDefinition[];
  popups: PopupConfig[];
}) {
  const [active, setActive] = useState<{ popup: PopupConfig; brochureUrl?: string } | null>(null);

  const value = useMemo<OpenPageRuntimeValue>(
    () => ({
      live,
      pageId,
      projectName,
      forms,
      popups,
      openPopup: (popupId, extra) => {
        const popup = popupId ? popups.find((p) => p.id === popupId) : popups[0];
        if (popup) setActive({ popup, brochureUrl: extra?.brochureUrl || popup.brochureUrl });
      },
      closePopup: () => setActive(null),
    }),
    [live, pageId, projectName, forms, popups],
  );

  return (
    <RuntimeContext.Provider value={value}>
      {children}
      {active ? (
        <div
          className="fixed inset-0 z-[80] bg-black/60 flex items-center justify-center p-4"
          onClick={() => {
            if (active.popup.closeOnOverlay) setActive(null);
          }}
        >
          <div
            className="relative w-full max-w-md rounded-2xl bg-bg-1 border border-border-default p-6 text-text-0"
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" className="absolute top-3 right-3 text-text-3" onClick={() => setActive(null)} aria-label="Close">
              <X size={16} />
            </button>
            {active.popup.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={active.popup.image} alt="" className="w-full h-36 object-cover rounded-xl mb-4" />
            ) : null}
            <h3 className="text-lg font-semibold mb-1">{active.popup.title}</h3>
            {active.popup.description ? <p className="text-sm text-text-2 mb-4">{active.popup.description}</p> : null}
            {active.popup.videoUrl ? (
              <iframe title="Popup video" src={active.popup.videoUrl} className="w-full aspect-video rounded-lg mb-4 border-0" />
            ) : null}
            {active.popup.formId || forms[0] ? (
              <DynamicLeadForm
                form={(findFormById(active.popup.formId || "", forms) ?? forms[0])!}
                live={live}
                pageId={pageId}
                place="popup"
                projectName={projectName}
                onSuccess={() => {
                  const url = active.brochureUrl || active.popup.brochureUrl;
                  if (url && typeof window !== "undefined") {
                    window.open(url, "_blank");
                  }
                  setActive(null);
                }}
              />
            ) : null}
            {active.popup.buttonText ? (
              <a
                href={active.popup.buttonUrl || active.brochureUrl || "#"}
                className="mt-4 inline-flex px-4 py-2 rounded-lg bg-green text-black text-sm font-semibold"
              >
                {active.popup.buttonText}
              </a>
            ) : null}
          </div>
        </div>
      ) : null}
    </RuntimeContext.Provider>
  );
}
