"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import type * as React from "react";
import { ChevronDown, ChevronRight, X } from "lucide-react";

// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------

type BtnVariant = "primary" | "dark" | "secondary" | "outline" | "ghost" | "danger" | "soft";

const BTN_STYLES: Record<BtnVariant, CSSProperties> = {
  primary: { background: "var(--ps-grad-primary)", color: "#fff", borderColor: "transparent", boxShadow: "0 6px 18px rgba(109,93,252,.3)" },
  dark: { background: "var(--ps-panel-raised)", color: "var(--ps-ink)", borderColor: "var(--ps-line-strong)" },
  secondary: { background: "linear-gradient(135deg,#c9a56a,#a8844a)", color: "#0a0c10", borderColor: "transparent", boxShadow: "0 6px 18px rgba(201,165,106,.25)" },
  outline: { background: "var(--ps-panel-raised)", color: "var(--ps-ink)", borderColor: "var(--ps-line-strong)" },
  ghost: { background: "transparent", color: "var(--ps-slate)", borderColor: "transparent" },
  danger: { background: "var(--ps-danger-soft)", color: "var(--ps-danger)", borderColor: "rgba(248,113,113,.3)" },
  soft: { background: "var(--ps-primary-soft)", color: "var(--ps-primary)", borderColor: "transparent" },
};

export function Btn({
  variant = "outline",
  size = "md",
  icon,
  children,
  style,
  ...props
}: {
  variant?: BtnVariant;
  size?: "sm" | "md" | "lg" | "icon";
  icon?: ReactNode;
  children?: ReactNode;
  style?: CSSProperties;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const pad =
    size === "sm" ? { padding: "6px 10px", fontSize: 12 } : size === "lg" ? { padding: "11px 20px", fontSize: 14 } : size === "icon" ? { padding: 7 } : { padding: "8px 14px", fontSize: 13 };
  return (
    <button className="ps-btn" style={{ ...BTN_STYLES[variant], ...pad, ...style }} {...props}>
      {icon}
      {children}
    </button>
  );
}

export function IconBtn({
  title,
  children,
  style,
  ...props
}: { title?: string; children: ReactNode; style?: CSSProperties } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      title={title}
      className="ps-btn"
      style={{
        padding: 6,
        borderRadius: 8,
        color: "var(--ps-muted)",
        background: "transparent",
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Chips & badges
// ---------------------------------------------------------------------------

export function Chip({
  tone = "neutral",
  children,
  style,
}: {
  tone?: "neutral" | "primary" | "secondary" | "success" | "warn" | "danger" | "info";
  children: ReactNode;
  style?: CSSProperties;
}) {
  const tones: Record<string, CSSProperties> = {
    neutral: { background: "rgba(255,255,255,0.06)", color: "var(--ps-slate)" },
    primary: { background: "var(--ps-primary-soft)", color: "var(--ps-primary)" },
    secondary: { background: "var(--ps-secondary-soft)", color: "var(--ps-gold)" },
    success: { background: "var(--ps-success-soft)", color: "var(--ps-success)" },
    warn: { background: "var(--ps-warn-soft)", color: "var(--ps-warn)" },
    danger: { background: "var(--ps-danger-soft)", color: "var(--ps-danger)" },
    info: { background: "rgba(96,165,250,0.12)", color: "#60a5fa" },
  };
  return (
    <span className="ps-chip" style={{ ...tones[tone], ...style }}>
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Toggle
// ---------------------------------------------------------------------------

export function Toggle({
  on,
  onChange,
  size = "md",
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  size?: "sm" | "md";
}) {
  const w = size === "md" ? 40 : 32;
  const h = size === "md" ? 22 : 18;
  const nub = size === "md" ? 16 : 14;
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      style={{
        width: w,
        height: h,
        borderRadius: 999,
        border: "none",
        background: on ? "var(--ps-primary)" : "rgba(255,255,255,0.12)",
        position: "relative",
        cursor: "pointer",
        flexShrink: 0,
        transition: "background .18s",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: (h - nub) / 2,
          left: on ? w - nub - 3 : 3,
          width: nub,
          height: nub,
          borderRadius: "50%",
          background: "#fff",
          transition: "left .18s",
          boxShadow: "0 1px 3px rgba(0,0,0,.25)",
        }}
      />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Form fields
// ---------------------------------------------------------------------------

export function FieldRow({
  label,
  children,
  hint,
  right,
  style,
}: {
  label: ReactNode;
  children: ReactNode;
  hint?: string;
  right?: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div style={{ marginBottom: 13, ...style }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
        <label className="ps-field-label">
          {label}
        </label>
        {right}
      </div>
      {children}
      {hint ? <div style={{ fontSize: 11, color: "var(--ps-muted)", marginTop: 4, lineHeight: 1.45 }}>{hint}</div> : null}
    </div>
  );
}

export function TextField({
  value,
  onChange,
  placeholder,
  prefix,
  type = "text",
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  prefix?: ReactNode;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {prefix}
      <input type={type} className="ps-input" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} disabled={disabled} />
    </div>
  );
}

export function SelectField({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <div style={{ position: "relative" }}>
      <select className="ps-input" value={value} onChange={(e) => onChange(e.target.value)} style={{ appearance: "none", paddingRight: 30, cursor: "pointer" }}>
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown size={15} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "var(--ps-muted)", pointerEvents: "none" }} />
    </div>
  );
}

export function SliderField({
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ flex: 1, accentColor: "var(--ps-primary)", cursor: "pointer" }}
      />
      <span
        style={{
          minWidth: 52,
          textAlign: "center",
          fontSize: 12,
          fontWeight: 700,
          color: "var(--ps-primary)",
          background: "var(--ps-primary-soft)",
          borderRadius: 7,
          padding: "3px 7px",
        }}
      >
        {value}
        {suffix ?? ""}
      </span>
    </div>
  );
}

/**
 * Length control: slider for px values plus a direct-value entry accepting
 * "10px", "1rem", "50%", "auto"… Strings are passed through to CSS untouched.
 */
export function LengthInput({
  value,
  onChange,
  min = 0,
  max = 240,
  step = 1,
}: {
  value: number | string | undefined;
  onChange: (v: number | string) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  const isNumeric = typeof value === "number" || value === undefined || (typeof value === "string" && /^-?\d+(\.\d+)?$/.test(value.trim()));
  const num = typeof value === "number" ? value : isNumeric ? Number(value ?? 0) : 0;

  const [text, setText] = useState<string | null>(null);
  const display = text ?? (value === undefined ? "" : String(value));

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {isNumeric ? (
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={num}
          onChange={(e) => {
            setText(null);
            onChange(Number(e.target.value));
          }}
          style={{ flex: 1, accentColor: "var(--ps-primary)", cursor: "pointer" }}
        />
      ) : (
        <span style={{ flex: 1, fontSize: 11, fontWeight: 600, color: "var(--ps-muted)", textAlign: "center" }}>custom unit</span>
      )}
      <input
        className="ps-input"
        value={display}
        placeholder="0"
        onChange={(e) => {
          const raw = e.target.value;
          setText(raw);
          const t = raw.trim();
          if (/^-?\d+(\.\d+)?$/.test(t)) onChange(Number(t));
          else if (t === "" ) onChange(0);
          else onChange(t);
        }}
        onBlur={() => setText(null)}
        style={{ width: 74, textAlign: "center", fontSize: 12, fontWeight: 700, padding: "4px 6px" }}
      />
    </div>
  );
}

export function ColorField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [custom, setCustom] = useState(false);
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <div style={{ position: "relative", overflow: "hidden", borderRadius: 8, border: "1px solid var(--ps-line-strong)", width: 36, height: 36, flexShrink: 0, cursor: "pointer" }}>
        <input
          type="color"
          value={value.startsWith("#") ? value : "#6D5DFC"}
          onChange={(e) => onChange(e.target.value)}
          style={{ position: "absolute", inset: -6, cursor: "pointer" }}
        />
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: value.startsWith("#") ? undefined : "linear-gradient(135deg,#6d5dfc,#cda45e)" }} />
      </div>
      {custom ? (
        <input className="ps-input" value={value} onChange={(e) => onChange(e.target.value)} placeholder="#hex" />
      ) : (
        <button className="ps-btn" style={{ padding: "7px 10px", fontSize: 12, color: "var(--ps-slate)", background: "var(--ps-bg)", border: "1px solid var(--ps-line)" }} onClick={() => setCustom(true)}>
          {value || "—"}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Collapsible section + tabs
// ---------------------------------------------------------------------------

export function Collapse({
  title,
  icon,
  children,
  defaultOpen,
  badge,
}: {
  title: ReactNode;
  icon?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  badge?: ReactNode;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div style={{ borderBottom: "1px solid var(--ps-line)", padding: "13px 0" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
          color: "var(--ps-ink)",
          textAlign: "left",
        }}
      >
        {icon ? <span style={{ color: "var(--ps-primary)", display: "inline-flex" }}>{icon}</span> : null}
        <span style={{ flex: 1, fontSize: 13, fontWeight: 700 }}>{title}</span>
        {badge}
        {open ? <ChevronDown size={15} style={{ color: "var(--ps-muted)" }} /> : <ChevronRight size={15} style={{ color: "var(--ps-muted)" }} />}
      </button>
      {open ? <div style={{ paddingTop: 12 }}>{children}</div> : null}
    </div>
  );
}

export function TabBar({
  tabs,
  active,
  onChange,
  style,
}: {
  tabs: { key: string; label: ReactNode }[];
  active: string;
  onChange: (k: string) => void;
  style?: CSSProperties;
}) {
  return (
    <div style={{ display: "flex", gap: 2, background: "var(--ps-bg)", borderRadius: 10, padding: 3, border: "1px solid var(--ps-line)", ...style }}>
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => onChange(t.key)}
          style={{
            flex: 1,
            padding: "7px 12px",
            border: "none",
            borderRadius: 8,
            background: active === t.key ? "var(--ps-panel-raised)" : "transparent",
            color: active === t.key ? "var(--ps-primary)" : "var(--ps-muted)",
            fontSize: 12.5,
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: active === t.key ? "0 1px 3px rgba(17,24,39,.08)" : "none",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            transition: "all .15s",
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  width = 560,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  width?: number;
}) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,.55)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div onClick={(e) => e.stopPropagation()} className="ps-fade-in ps-modal-card" style={{ width, maxWidth: "100%", maxHeight: "90vh", overflow: "auto", background: "var(--ps-panel)", borderRadius: 18, boxShadow: "var(--ps-shadow-lg)", border: "1px solid var(--ps-line)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--ps-line)" }}>
          <div style={{ fontSize: 15, fontWeight: 800 }}>{title}</div>
          <IconBtn title="Close" onClick={onClose}>
            <X size={16} />
          </IconBtn>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  text,
  action,
}: {
  icon: ReactNode;
  title: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "56px 24px", textAlign: "center", color: "var(--ps-muted)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 56, height: 56, borderRadius: 16, background: "var(--ps-primary-soft)", color: "var(--ps-primary)", marginBottom: 14 }}>
        {icon}
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ps-ink)", marginBottom: 4 }}>{title}</div>
      {text ? <div style={{ fontSize: 13, maxWidth: 300, lineHeight: 1.55 }}>{text}</div> : null}
      {action ? <div style={{ marginTop: 16 }}>{action}</div> : null}
    </div>
  );
}

export function Dot({ color }: { color: string }) {
  return <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0 }} />;
}