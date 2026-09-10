"use client";

import type { ReactNode } from "react";
import { Modal } from "./modal";
import { Icon } from "@/components/icons";

/**
 * App-wide replacement for `window.confirm()`. Native browser dialogs are
 * not used anywhere in this app — route every "are you sure?" through this.
 *
 * Self-styled with Tailwind so it renders correctly inside any area
 * (org console, admin console, builder) regardless of the local CSS.
 */
export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  busy = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm" closeDisabled={busy}>
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        {/* Icon */}
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            background: destructive ? "#fef2f2" : "#eef2ff",
            color: destructive ? "#e11d48" : "#4f46e5",
          }}
        >
          <Icon name={destructive ? "alert" : "info"} size={20} />
        </div>

        {/* Message */}
        <div style={{ flex: 1, paddingTop: 2 }}>
          {message ? (
            <div
              style={{
                fontSize: 14,
                lineHeight: 1.6,
                color: "#475569",
              }}
            >
              {message}
            </div>
          ) : null}
        </div>
      </div>

      {/* Actions */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 10,
          marginTop: 24,
          paddingTop: 16,
          borderTop: "1px solid #f1f5f9",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          style={{
            padding: "9px 18px",
            borderRadius: 10,
            fontSize: 13.5,
            fontWeight: 500,
            border: "1px solid #e2e8f0",
            background: "#ffffff",
            color: "#475569",
            cursor: busy ? "not-allowed" : "pointer",
            opacity: busy ? 0.5 : 1,
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            if (!busy) {
              e.currentTarget.style.background = "#f8fafc";
              e.currentTarget.style.borderColor = "#cbd5e1";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#ffffff";
            e.currentTarget.style.borderColor = "#e2e8f0";
          }}
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          style={{
            padding: "9px 18px",
            borderRadius: 10,
            fontSize: 13.5,
            fontWeight: 600,
            border: "none",
            color: "#ffffff",
            cursor: busy ? "not-allowed" : "pointer",
            opacity: busy ? 0.5 : 1,
            transition: "all 0.15s ease",
            background: destructive
              ? "linear-gradient(135deg, #e11d48, #be123c)"
              : "linear-gradient(135deg, #4f46e5, #4338ca)",
            boxShadow: destructive
              ? "0 2px 8px -2px rgba(225, 29, 72, 0.4)"
              : "0 2px 8px -2px rgba(79, 70, 229, 0.4)",
          }}
          onMouseEnter={(e) => {
            if (!busy) {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = destructive
                ? "0 4px 12px -2px rgba(225, 29, 72, 0.5)"
                : "0 4px 12px -2px rgba(79, 70, 229, 0.5)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = destructive
              ? "0 2px 8px -2px rgba(225, 29, 72, 0.4)"
              : "0 2px 8px -2px rgba(79, 70, 229, 0.4)";
          }}
        >
          {busy ? (
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  width: 14,
                  height: 14,
                  border: "2px solid rgba(255,255,255,0.3)",
                  borderTopColor: "#fff",
                  borderRadius: "50%",
                  animation: "confirmSpin 0.6s linear infinite",
                }}
              />
              Working…
            </span>
          ) : (
            confirmLabel
          )}
        </button>
      </div>

      <style>{`
        @keyframes confirmSpin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Modal>
  );
}
