"use client";

import { useEffect, useRef } from "react";
import type * as React from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Eraser,
  Highlighter,
  Italic,
  Link2,
  Link2Off,
  List,
  ListOrdered,
  IndentIncrease,
  IndentDecrease,
  Strikethrough,
  Underline,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Lightweight WYSIWYG editor used by the Text Editor widget. No dependencies —
// contentEditable + execCommand, with span-wrapping for CSS-only properties.
// ---------------------------------------------------------------------------

function ensureStyleCss() {
  document.execCommand("styleWithCSS", false, "true");
}

/** Wrap the current selection in a span with inline styles (for CSS props without execCommand). */
function wrapSelection(style: Record<string, string>): boolean {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return false;
  const range = sel.getRangeAt(0);
  if (!range.toString().trim()) return false;
  const span = document.createElement("span");
  for (const [k, v] of Object.entries(style)) {
    (span.style as unknown as Record<string, string>)[k] = v;
  }
  try {
    range.surroundContents(span);
  } catch {
    const frag = range.extractContents();
    span.appendChild(frag);
    range.insertNode(span);
    sel.removeAllRanges();
  }
  return true;
}

/** Apply a style to the block element containing the caret (line-height, paragraph spacing…). */
function styleBlock(prop: string, value: string): boolean {
  const sel = window.getSelection();
  let node: Node | null = sel?.anchorNode ?? null;
  while (node && !(node instanceof HTMLElement && /^(P|DIV|LI|H[1-6]|BLOCKQUOTE)$/.test(node.tagName))) {
    node = node.parentElement;
  }
  if (node instanceof HTMLElement && node.isContentEditable !== false) {
    (node.style as unknown as Record<string, string>)[prop] = value;
    return true;
  }
  return false;
}

export function RichTextEditor({
  value,
  onChange,
  fontOptions,
}: {
  value: string;
  onChange: (html: string) => void;
  /** Selectable families (custom uploads first). */
  fontOptions?: { value: string; label: string }[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const lastEmitted = useRef<string>(value);
  const mounted = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!mounted.current || (value !== lastEmitted.current && value !== el.innerHTML)) {
      el.innerHTML = value || "";
      lastEmitted.current = value;
    }
    mounted.current = true;
  }, [value]);

  const emit = () => {
    const el = ref.current;
    if (!el) return;
    lastEmitted.current = el.innerHTML;
    onChange(el.innerHTML);
  };

  const exec = (cmd: string, arg?: string) => {
    ref.current?.focus();
    ensureStyleCss();
    document.execCommand(cmd, false, arg);
    emit();
  };

  const applySpan = (style: Record<string, string>) => {
    ref.current?.focus();
    if (wrapSelection(style)) emit();
  };

  const applyBlock = (prop: string, value: string) => {
    ref.current?.focus();
    if (styleBlock(prop, value)) emit();
  };

  const addLink = () => {
    const url = window.prompt("Link URL", "https://");
    if (!url) return;
    exec("createLink", url);
  };

  return (
    <div style={{ border: "1px solid var(--ps-line-strong)", borderRadius: 10, overflow: "hidden", background: "#fff" }}>
      {/* Toolbar row 1 */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 1, padding: 5, borderBottom: "1px solid var(--ps-line)", background: "var(--ps-bg)" }}>
        <ToolBtn title="Bold" onClick={() => exec("bold")}><Bold size={14} /></ToolBtn>
        <ToolBtn title="Italic" onClick={() => exec("italic")}><Italic size={14} /></ToolBtn>
        <ToolBtn title="Underline" onClick={() => exec("underline")}><Underline size={14} /></ToolBtn>
        <ToolBtn title="Strikethrough" onClick={() => exec("strikeThrough")}><Strikethrough size={14} /></ToolBtn>
        <span style={{ width: 1, background: "var(--ps-line)", margin: "3px 4px" }} />
        <ToolBtn title="Bulleted list" onClick={() => exec("insertUnorderedList")}><List size={14} /></ToolBtn>
        <ToolBtn title="Numbered list" onClick={() => exec("insertOrderedList")}><ListOrdered size={14} /></ToolBtn>
        <span style={{ width: 1, background: "var(--ps-line)", margin: "3px 4px" }} />
        <ToolBtn title="Indent" onClick={() => exec("indent")}><IndentIncrease size={14} /></ToolBtn>
        <ToolBtn title="Outdent" onClick={() => exec("outdent")}><IndentDecrease size={14} /></ToolBtn>
        <span style={{ width: 1, background: "var(--ps-line)", margin: "3px 4px" }} />
        <ToolBtn title="Align left" onClick={() => exec("justifyLeft")}><AlignLeft size={14} /></ToolBtn>
        <ToolBtn title="Align center" onClick={() => exec("justifyCenter")}><AlignCenter size={14} /></ToolBtn>
        <ToolBtn title="Align right" onClick={() => exec("justifyRight")}><AlignRight size={14} /></ToolBtn>
        <ToolBtn title="Justify" onClick={() => exec("justifyFull")}><AlignJustify size={14} /></ToolBtn>
        <span style={{ width: 1, background: "var(--ps-line)", margin: "3px 4px" }} />
        <ToolBtn title="Insert link" onClick={addLink}><Link2 size={14} /></ToolBtn>
        <ToolBtn title="Remove link" onClick={() => exec("unlink")}><Link2Off size={14} /></ToolBtn>
        <ToolBtn title="Clear formatting" onClick={() => exec("removeFormat")}><Eraser size={14} /></ToolBtn>
      </div>

      {/* Toolbar row 2 */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center", padding: 5, borderBottom: "1px solid var(--ps-line)", background: "var(--ps-bg)" }}>
        <MiniSelect
          title="Font family"
          options={[
            ...(fontOptions ?? []),
            { value: "Arial, sans-serif", label: "Arial" },
            { value: "Georgia, serif", label: "Georgia" },
            { value: "'Courier New', monospace", label: "Courier New" },
          ]}
          onChange={(v) => applySpan({ fontFamily: v.includes('"') ? v : `"${v}"` })}
          placeholder="Font"
        />
        <MiniSelect
          title="Font size"
          options={[10, 11, 12, 13, 14, 15, 16, 18, 20, 24, 28, 32, 40, 48, 56].map((n) => ({ value: String(n), label: `${n}px` }))}
          onChange={(v) => applySpan({ fontSize: `${v}px` })}
          placeholder="Size"
        />
        <MiniSelect
          title="Line height"
          options={[1, 1.15, 1.3, 1.5, 1.75, 2, 2.5].map((n) => ({ value: String(n), label: String(n) }))}
          onChange={(v) => applyBlock("lineHeight", v)}
          placeholder="Line ▸"
        />
        <MiniSelect
          title="Letter spacing"
          options={[-1, 0, 0.5, 1, 2, 4, 8].map((n) => ({ value: String(n), label: `${n}px` }))}
          onChange={(v) => applySpan({ letterSpacing: `${v}px` })}
          placeholder="Spacing"
        />
        <MiniSelect
          title="Paragraph spacing"
          options={["0px", "4px", "8px", "12px", "16px", "24px", "32px"].map((v) => ({ value: v, label: v }))}
          onChange={(v) => applyBlock("marginBottom", v)}
          placeholder="Para ↕"
        />
        <ColorInput title="Text colour" onPick={(v) => applySpan({ color: v })} icon={<PenLineIcon />} />
        <ColorInput title="Highlight / background" onPick={(v) => applySpan({ backgroundColor: v })} icon={<Highlighter size={14} />} />
      </div>

      {/* Editing surface */}
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        tabIndex={0}
        data-placeholder="Write something…"
        onInput={emit}
        onBlur={emit}
        onKeyDown={(e) => e.stopPropagation()}
        className="ps-rte-surface ps-rich"
        style={{ minHeight: 130, maxHeight: 320, overflowY: "auto", padding: "12px 14px", fontSize: 13.5, lineHeight: 1.7, outline: "none", color: "var(--ps-ink)" }}
      />

      <style>{`
        .ps-rte-surface:empty:before { content: attr(data-placeholder); color: var(--ps-muted); pointer-events: none; }
        .ps-rich p { margin: 0 0 0.8em; }
        .ps-rich h1,.ps-rich h2,.ps-rich h3,.ps-rich h4,.ps-rich h5,.ps-rich h6 { margin: 0.45em 0 0.35em; }
        .ps-rich ul,.ps-rich ol { padding-left: 1.35em; margin: 0.4em 0; }
        .ps-rich li { margin: 0.25em 0; }
        .ps-rich a { color: var(--ps-primary); text-decoration: underline; }
        .ps-rich blockquote { border-left: 3px solid var(--ps-primary); margin: 0.6em 0; padding-left: 12px; opacity: .9; }
        .ps-rich img { max-width: 100%; border-radius: 10px; }
        .ps-rich hr { border: none; border-top: 1px solid var(--ps-line); margin: 1em 0; }
      `}</style>
    </div>
  );
}

function PenLineIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function ToolBtn({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      style={{ width: 27, height: 27, borderRadius: 7, border: "none", background: "transparent", color: "var(--ps-slate)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--ps-primary-mist)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {children}
    </button>
  );
}

function MiniSelect({
  title,
  options,
  onChange,
  placeholder,
}: {
  title: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <select
      className="ps-input"
      title={title}
      defaultValue=""
      onChange={(e) => {
        if (!e.target.value) return;
        onChange(e.target.value);
        e.target.value = "";
      }}
      style={{ maxWidth: 108, height: 26, fontSize: 11.5, padding: "0 6px", flexShrink: 0 }}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function ColorInput({ title, onPick, icon }: { title: string; onPick: (v: string) => void; icon: React.ReactNode }) {
  return (
    <label
      title={title}
      style={{ position: "relative", width: 27, height: 27, borderRadius: 7, display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--ps-slate)", cursor: "pointer", overflow: "hidden", flexShrink: 0 }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {icon}
      <input
        type="color"
        value="#111827"
        onChange={(e) => onPick(e.target.value)}
        style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
      />
    </label>
  );
}

/** Minimal sanitiser for builder-authored HTML rendered on the page. */
export function sanitizeHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son\w+\s*=\s*'[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}
