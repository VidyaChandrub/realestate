"use client";

import { LeftSidebar } from "./LeftSidebar";
import { Canvas } from "./Canvas";
import { RightSidebar } from "./RightSidebar";
import { JsonDrawer } from "./JsonDrawer";
import { VersionHistory } from "./VersionHistory";
import { CanvasToolbar } from "./CanvasToolbar";
import { ShortcutsModal } from "./ShortcutsModal";
import { useEditorStore } from "@/components/openpage/store/editorStore";
import { OpenPageRuntimeProvider } from "@/components/openpage/runtime/OpenPageRuntime";
import { useConfigStore } from "@/components/openpage/store/configStore";
import { Toaster } from "sonner";
import { useOpenPageKeyboard } from "@/lib/openpage/useKeyboardShortcuts";

export function EditorLayout({
  pageId,
  captureLeads = true,
}: {
  pageId?: string;
  /** When true and pageId is set, canvas form submits write to CRM (same as Preview). */
  captureLeads?: boolean;
}) {
  useOpenPageKeyboard();
  const previewMode = useEditorStore((s) => s.previewMode);
  const config = useConfigStore((s) => s.config);
  const canCapture = Boolean(captureLeads && pageId);

  return (
    <OpenPageRuntimeProvider
      live={canCapture}
      pageId={pageId}
      projectName={config.property?.name || config.name}
      projectId={
        config.propertyBinding?.kind === "project"
          ? config.propertyBinding.projectId
          : undefined
      }
      unitId={
        config.propertyBinding?.kind === "unit"
          ? config.propertyBinding.unitId
          : undefined
      }
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
      </div>
    </OpenPageRuntimeProvider>
  );
}
