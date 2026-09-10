"use client";

import { LeftSidebar } from "./LeftSidebar";
import { Canvas } from "./Canvas";
import { RightSidebar } from "./RightSidebar";
import { JsonDrawer } from "./JsonDrawer";
import { VersionHistory } from "./VersionHistory";
import { CanvasToolbar } from "./CanvasToolbar";
import { ShortcutsModal } from "./ShortcutsModal";
import { FormBuilder } from "./FormBuilder";
import { useEditorStore } from "@/components/openpage/store/editorStore";
import { OpenPageRuntimeProvider } from "@/components/openpage/runtime/OpenPageRuntime";
import { useConfigStore } from "@/components/openpage/store/configStore";
import { Toaster } from "sonner";
import { useOpenPageKeyboard } from "@/lib/openpage/useKeyboardShortcuts";

export function EditorLayout() {
  useOpenPageKeyboard();
  const previewMode = useEditorStore((s) => s.previewMode);
  const formBuilderOpen = useEditorStore((s) => s.formBuilderOpen);
  const toggleFormBuilder = useEditorStore((s) => s.toggleFormBuilder);
  const config = useConfigStore((s) => s.config);

  return (
    <OpenPageRuntimeProvider
      live={false}
      pageId={undefined}
      projectName={config.property?.name || config.name}
      forms={config.forms ?? []}
      popups={config.popups ?? []}
    >
      <div className="op-root h-full flex flex-col relative min-h-0">
        <Toaster theme="dark" position="bottom-right" />
        <div className="flex-1 flex overflow-hidden min-h-0">
          {!previewMode && <LeftSidebar />}
          <div className="flex-1 flex flex-col min-w-0 relative">
            <CanvasToolbar />
            <div className="flex-1 flex flex-col overflow-hidden relative">
              <Canvas />
              <JsonDrawer />
            </div>
          </div>
          {!previewMode && <RightSidebar />}
        </div>
        <VersionHistory />
        <ShortcutsModal />

        {/* Form Builder Slide Panel */}
        {formBuilderOpen && (
          <div
            className="fixed inset-0 z-[200] flex justify-end bg-black/40 backdrop-blur-sm"
            onClick={toggleFormBuilder}
          >
            <div
              className="w-[480px] max-w-[95vw] h-full bg-bg-1 border-l border-border-default shadow-[0_8px_32px_rgba(0,0,0,0.4)] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <FormBuilder onClose={toggleFormBuilder} />
            </div>
          </div>
        )}
      </div>
    </OpenPageRuntimeProvider>
  );
}
