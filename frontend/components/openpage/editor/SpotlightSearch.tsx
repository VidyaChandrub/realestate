"use client";

import { useState, useEffect, useRef } from "react";
import {
  Search,
  Plus,
  Monitor,
  Tablet,
  Smartphone,
  Undo2,
  Redo2,
  FileText,
  Sliders,
  Sparkles,
  Command,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { useConfigStore } from "@/components/openpage/store/configStore";
import { useEditorStore, type Viewport } from "@/components/openpage/store/editorStore";
import { blockMetadata } from "@/lib/openpage/block-metadata";
import { createBlockFromType } from "@/lib/openpage/block-factory";
import type { BlockType } from "@/components/openpage/blocks/types";

interface SpotlightSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SpotlightSearch({ isOpen, onClose }: SpotlightSearchProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { addBlock, undo, redo, canUndo, canRedo } = useConfigStore();
  const { setViewport, selectBlock, setRightSidebarTab } = useEditorStore();
  const pages = useConfigStore((s) => s.config.pages || []);
  const setActivePage = useConfigStore((s) => s.setActivePage);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
    }
  }, [isOpen]);

  // Global key listener for Ctrl+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Open spotlight
          const btn = document.getElementById("op-spotlight-trigger");
          btn?.click();
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const trimmed = query.trim().toLowerCase();

  // Filtered blocks
  const matchedBlocks = blockMetadata.filter(
    (b) =>
      b.label.toLowerCase().includes(trimmed) ||
      b.type.toLowerCase().includes(trimmed) ||
      b.category.toLowerCase().includes(trimmed)
  );

  // Filtered pages
  const matchedPages = pages.filter((p) =>
    p.name.toLowerCase().includes(trimmed)
  );

  const handleInsertBlock = (type: BlockType, label: string) => {
    const newBlock = createBlockFromType(type);
    if (newBlock) {
      addBlock(newBlock);
      selectBlock(newBlock.id);
      setRightSidebarTab("properties");
      toast.success(`${label} inserted`);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-[#161a23] border border-border-default rounded-2xl shadow-2xl overflow-hidden flex flex-col select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-border-default gap-3 bg-bg-1">
          <Search size={16} className="text-text-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
            }}
            placeholder="Search widgets, pages, viewports, actions... (Ctrl+K)"
            className="flex-1 bg-transparent text-text-0 text-sm outline-none placeholder:text-text-3"
          />
          <kbd className="px-1.5 py-0.5 rounded bg-bg-3 border border-border-default text-[10px] text-text-3 font-mono">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-3">
          {/* Quick Actions if query is empty */}
          {!trimmed && (
            <div>
              <div className="text-[10px] uppercase font-bold text-text-3 px-2 mb-1.5 tracking-wider">
                Quick Actions
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setViewport("desktop");
                    onClose();
                  }}
                  className="px-2.5 py-2 rounded-lg bg-bg-2 border border-border-subtle hover:border-green/40 hover:bg-bg-3 text-text-1 hover:text-white flex items-center gap-2 text-xs transition-colors"
                >
                  <Monitor size={14} className="text-blue-400" />
                  <span>Desktop View</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setViewport("tablet");
                    onClose();
                  }}
                  className="px-2.5 py-2 rounded-lg bg-bg-2 border border-border-subtle hover:border-green/40 hover:bg-bg-3 text-text-1 hover:text-white flex items-center gap-2 text-xs transition-colors"
                >
                  <Tablet size={14} className="text-purple-400" />
                  <span>Tablet View</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setViewport("mobile");
                    onClose();
                  }}
                  className="px-2.5 py-2 rounded-lg bg-bg-2 border border-border-subtle hover:border-green/40 hover:bg-bg-3 text-text-1 hover:text-white flex items-center gap-2 text-xs transition-colors"
                >
                  <Smartphone size={14} className="text-emerald-400" />
                  <span>Mobile View</span>
                </button>
              </div>
            </div>
          )}

          {/* Widgets / Blocks */}
          {matchedBlocks.length > 0 && (
            <div>
              <div className="text-[10px] uppercase font-bold text-text-3 px-2 mb-1 tracking-wider">
                Insert Widgets & Sections ({matchedBlocks.length})
              </div>
              <div className="space-y-0.5">
                {matchedBlocks.slice(0, 8).map((b) => (
                  <button
                    key={b.type}
                    type="button"
                    onClick={() => handleInsertBlock(b.type, b.label)}
                    className="w-full px-2.5 py-1.5 rounded-lg hover:bg-bg-3 flex items-center justify-between group transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                        <Plus size={13} />
                      </div>
                      <div>
                        <div className="text-xs text-text-1 group-hover:text-white font-medium">
                          {b.label}
                        </div>
                        <div className="text-[10px] text-text-3 capitalize">
                          {b.category}
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] text-green opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                      <span>Insert</span>
                      <ArrowRight size={11} />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Pages */}
          {matchedPages.length > 0 && (
            <div>
              <div className="text-[10px] uppercase font-bold text-text-3 px-2 mb-1 tracking-wider">
                Jump to Page
              </div>
              <div className="space-y-0.5">
                {matchedPages.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setActivePage(p.id);
                      toast.info(`Switched to ${p.name}`);
                      onClose();
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg hover:bg-bg-3 flex items-center gap-2 text-xs text-text-1 hover:text-white transition-colors text-left"
                  >
                    <FileText size={13} className="text-amber-400" />
                    <span>{p.name}</span>
                    <span className="text-[10px] font-mono text-text-3">({p.path})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {matchedBlocks.length === 0 && matchedPages.length === 0 && (
            <div className="py-8 text-center text-text-3 text-xs">
              No matching widgets or pages found for &quot;{query}&quot;
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 border-t border-border-default bg-bg-1 flex items-center justify-between text-[10.5px] text-text-3">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <span className="text-text-3">OpenPage Spotlight</span>
        </div>
      </div>
    </div>
  );
}
