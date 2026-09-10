"use client";

import { createContext, useContext, useMemo, useState, useEffect, useCallback, type ReactNode } from "react";
import { findFormById, type FormDefinition } from "@/lib/openpage/forms-store";
import type { PopupConfig } from "@/components/openpage/blocks/types";
import { DynamicLeadForm } from "@/components/openpage/dynamic-lead-form";
import { X, ArrowRight, CheckCircle2 } from "lucide-react";

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

function PopupSuccess({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="op-popup-success">
      <div className="op-popup-success-icon">
        <CheckCircle2 size={36} strokeWidth={2} />
      </div>
      <h3 className="op-popup-success-title">Thank You!</h3>
      <p className="op-popup-success-desc">
        Your enquiry has been submitted. Our team will contact you shortly.
      </p>
      <button type="button" className="op-popup-success-btn" onClick={onDismiss}>
        Done
      </button>
    </div>
  );
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
  const [visible, setVisible] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const closePopup = useCallback(() => {
    setVisible(false);
    setTimeout(() => {
      setActive(null);
      setShowSuccess(false);
    }, 280);
  }, []);

  const openPopup = useCallback(
    (popupId?: string, extra?: { brochureUrl?: string }) => {
      const popup = popupId ? popups.find((p) => p.id === popupId) : popups[0];
      if (popup) {
        setShowSuccess(false);
        setActive({ popup, brochureUrl: extra?.brochureUrl || popup.brochureUrl });
        requestAnimationFrame(() => {
          requestAnimationFrame(() => setVisible(true));
        });
      }
    },
    [popups],
  );

  useEffect(() => {
    if (active && !visible) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
    }
  }, [active, visible]);

  // Cross-component popup trigger — dispatched by the project widget after a
  // form submission with an `openPopupId`. Makes popups work end-to-end.
  useEffect(() => {
    function onOpenPopup(e: Event) {
      const detail = (e as CustomEvent<{ popupId?: string }>).detail;
      openPopup(detail?.popupId);
    }
    window.addEventListener("prestate:open-popup", onOpenPopup);
    return () => window.removeEventListener("prestate:open-popup", onOpenPopup);
  }, [openPopup]);

  const value = useMemo<OpenPageRuntimeValue>(
    () => ({
      live,
      pageId,
      projectName,
      forms,
      popups,
      openPopup,
      closePopup,
    }),
    [live, pageId, projectName, forms, popups, openPopup, closePopup],
  );

  return (
    <RuntimeContext.Provider value={value}>
      {children}
      {active ? (
        <div
          className={`op-popup-overlay ${visible ? "op-popup-overlay--visible" : ""}`}
          onClick={() => {
            if (active.popup.closeOnOverlay) closePopup();
          }}
        >
          <div
            className={`op-popup-card ${visible ? "op-popup-card--visible" : ""}`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="op-popup-close"
              onClick={closePopup}
              aria-label="Close"
            >
              <X size={16} strokeWidth={2.5} />
            </button>

            {showSuccess ? (
              <PopupSuccess onDismiss={closePopup} />
            ) : (
              <>
                {active.popup.image ? (
                  <div className="op-popup-image-wrap">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={active.popup.image}
                      alt=""
                      className="op-popup-image"
                    />
                    <div className="op-popup-image-fade" />
                  </div>
                ) : null}

                <div className="op-popup-body">
                  {active.popup.title ? (
                    <h3 className="op-popup-title">{active.popup.title}</h3>
                  ) : null}
                  {active.popup.description ? (
                    <p className="op-popup-desc">{active.popup.description}</p>
                  ) : null}

                  {active.popup.videoUrl ? (
                    <div className="op-popup-video-wrap">
                      <iframe
                        title="Popup video"
                        src={active.popup.videoUrl}
                        className="op-popup-video"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : null}

                  {active.popup.formId || forms[0] ? (
                    <div className="op-popup-form-wrap">
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
                          setShowSuccess(true);
                        }}
                      />
                    </div>
                  ) : null}

                  {active.popup.buttonText ? (
                    <a
                      href={active.popup.buttonUrl || active.brochureUrl || "#"}
                      className="op-popup-cta"
                    >
                      {active.popup.buttonText}
                      <ArrowRight size={14} strokeWidth={2.5} />
                    </a>
                  ) : null}
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </RuntimeContext.Provider>
  );
}
