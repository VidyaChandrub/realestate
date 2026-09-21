"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Device } from "@/lib/openpage/types";

/** Matches the existing live-site breakpoints in app/openpage.css. */
export function getDeviceForWidth(width: number): Device {
  if (width <= 640) return "mobile";
  if (width <= 1024) return "tablet";
  return "desktop";
}

const DeviceContext = createContext<Device | "auto">("auto");

/**
 * Forces which device the tree below is being laid out for.
 * - Builder canvas: pass the viewport from the editor store (editorStore.viewport).
 * - Live render: pass "auto" so the device is derived from the real window width,
 *   giving published pages the same refresh-on-resize behaviour as the canvas.
 */
export function DeviceProvider({
  device,
  children,
}: {
  device: Device | "auto";
  children: ReactNode;
}) {
  return <DeviceContext.Provider value={device}>{children}</DeviceContext.Provider>;
}

export function useDevice(): Device {
  const forced = useContext(DeviceContext);
  const [auto, setAuto] = useState<Device>(() =>
    typeof window !== "undefined" ? getDeviceForWidth(window.innerWidth) : "desktop",
  );

  useEffect(() => {
    if (forced !== "auto") return;
    const compute = () => setAuto(getDeviceForWidth(window.innerWidth));
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, [forced]);

  return forced === "auto" ? auto : forced;
}