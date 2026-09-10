"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { useEditorStore } from "@/components/openpage/store/editorStore";
import { useConfigStore } from "@/components/openpage/store/configStore";

export function useOpenPageKeyboard() {
  const { toggleJsonDrawer, toggleHistory, toggleShortcutsModal, togglePreview, toggleFormBuilder, selectBlock, setClipboardStyle, setRightSidebarTab } = useEditorStore();
  const { undo, redo, removeBlock, duplicateBlock } = useConfigStore();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        toggleShortcutsModal();
        return;
      }

      if (!e.metaKey && !e.ctrlKey) {
        switch (e.key) {
          case "j":
          case "J":
            e.preventDefault();
            toggleJsonDrawer();
            return;
          case "h":
          case "H":
            e.preventDefault();
            toggleHistory();
            return;
          case "p":
          case "P":
            e.preventDefault();
            togglePreview();
            return;
          case "f":
          case "F":
            e.preventDefault();
            toggleFormBuilder();
            return;
          case "Escape":
            e.preventDefault();
            selectBlock(null);
            return;
          case "Delete":
          case "Backspace": {
            const selectedId = useEditorStore.getState().selectedBlockId;
            if (selectedId) {
              e.preventDefault();
              removeBlock(selectedId);
              selectBlock(null);
              toast('Block deleted');
            }
            return;
          }
          case "d":
          case "D": {
            const selectedId = useEditorStore.getState().selectedBlockId;
            if (selectedId) {
              e.preventDefault();
              duplicateBlock(selectedId);
              toast('Block duplicated');
            }
            return;
          }
          case "1":
            e.preventDefault();
            setRightSidebarTab('properties');
            return;
          case "2":
            e.preventDefault();
            setRightSidebarTab('style');
            return;
          case "3":
            e.preventDefault();
            setRightSidebarTab('typography');
            return;
          case "4":
            e.preventDefault();
            setRightSidebarTab('advanced');
            return;
        }
      }

      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }

      if ((e.metaKey || e.ctrlKey) && e.key === "c") {
        const selectedId = useEditorStore.getState().selectedBlockId;
        if (selectedId) {
          const blocks = useConfigStore.getState().getActivePageBlocks();
          const block = blocks.find((b) => b.id === selectedId);
          if (block?.style) {
            setClipboardStyle(block.style);
            toast('Style copied');
          }
        }
      }

      if ((e.metaKey || e.ctrlKey) && e.key === "v") {
        const selectedId = useEditorStore.getState().selectedBlockId;
        if (selectedId) {
          const pasted = useEditorStore.getState().clipboardStyle;
          if (pasted) {
            useConfigStore.getState().updateBlockStyle(selectedId, pasted);
            toast('Style pasted');
          }
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleJsonDrawer, toggleHistory, toggleShortcutsModal, togglePreview, toggleFormBuilder, selectBlock, undo, redo, removeBlock, duplicateBlock, setClipboardStyle, setRightSidebarTab]);
}
