"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { GripVertical } from "lucide-react";
import { useConfigStore } from "@/components/openpage/store/configStore";

interface ColumnResizerProps {
  sectionBlockId: string;
  leftIndex: number;
  leftWidth: number;
  rightWidth: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function ColumnResizer({
  sectionBlockId,
  leftIndex,
  leftWidth,
  rightWidth,
  containerRef,
}: ColumnResizerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [liveLeft, setLiveLeft] = useState(leftWidth);
  const [liveRight, setLiveRight] = useState(rightWidth);
  const { updateColumnWidth } = useConfigStore();
  const startXRef = useRef(0);
  const startLeftWidthRef = useRef(leftWidth);
  const startRightWidthRef = useRef(rightWidth);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    startXRef.current = e.clientX;
    startLeftWidthRef.current = leftWidth;
    startRightWidthRef.current = rightWidth;
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const containerWidth = containerRef.current.getBoundingClientRect().width;
      if (containerWidth <= 0) return;

      const deltaX = e.clientX - startXRef.current;
      const deltaPercent = (deltaX / containerWidth) * 100;

      const combined = startLeftWidthRef.current + startRightWidthRef.current;
      let nextLeft = Math.round(startLeftWidthRef.current + deltaPercent);
      // Min column width 10%, max (combined - 10%)
      nextLeft = Math.max(10, Math.min(combined - 10, nextLeft));
      const nextRight = combined - nextLeft;

      setLiveLeft(nextLeft);
      setLiveRight(nextRight);
    },
    [isDragging, containerRef]
  );

  const handleMouseUp = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);

    updateColumnWidth(sectionBlockId, leftIndex, liveLeft);
    updateColumnWidth(sectionBlockId, leftIndex + 1, liveRight);
  }, [isDragging, leftIndex, liveLeft, liveRight, sectionBlockId, updateColumnWidth]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      onMouseDown={handleMouseDown}
      className={`relative z-30 flex items-center justify-center cursor-col-resize select-none transition-all group ${
        isDragging
          ? "w-2 bg-blue-500 rounded shadow-lg shadow-blue-500/50"
          : "w-2 -mx-1 hover:bg-blue-500/40 rounded"
      }`}
      title="Drag to resize columns"
    >
      <div
        className={`w-4 h-7 rounded-full flex items-center justify-center transition-all ${
          isDragging
            ? "bg-blue-600 text-white shadow-md scale-110"
            : "bg-[#1f2430] border border-border-default text-text-3 group-hover:text-white group-hover:border-blue-400"
        }`}
      >
        <GripVertical size={10} />
      </div>

      {/* Floating tooltip during drag */}
      {isDragging && (
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-black/90 text-white text-[10px] font-mono whitespace-nowrap shadow-md pointer-events-none">
          {liveLeft}% | {liveRight}%
        </div>
      )}
    </div>
  );
}
