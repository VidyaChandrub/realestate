"use client";

import type { ReactNode } from "react";
import { Modal } from "./modal";

/**
 * App-wide replacement for `window.confirm()`. Native browser dialogs are
 * not used anywhere in this app — route every "are you sure?" through this.
 *
 * Self-styled with Tailwind so it renders correctly inside any area
 * (org console, admin console, prestate) regardless of the local CSS.
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
    <Modal open={open} onClose={onClose} title={title} size="sm">
      {message ? (
        <div className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          {message}
        </div>
      ) : null}
      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className={
            "rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50 " +
            (destructive
              ? "bg-rose-600 hover:bg-rose-700"
              : "bg-indigo-600 hover:bg-indigo-700")
          }
        >
          {busy ? "Working…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
