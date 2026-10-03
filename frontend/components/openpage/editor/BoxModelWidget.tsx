"use client";

import { useState } from "react";
import { Link2, Link2Off, RotateCcw } from "lucide-react";

interface BoxModelProps {
  marginTop?: string;
  marginRight?: string;
  marginBottom?: string;
  marginLeft?: string;
  paddingTop?: string;
  paddingRight?: string;
  paddingBottom?: string;
  paddingLeft?: string;
  onChangeMargin: (m: { top?: string; right?: string; bottom?: string; left?: string }) => void;
  onChangePadding: (p: { top?: string; right?: string; bottom?: string; left?: string }) => void;
}

function cleanVal(v?: string): string {
  if (!v) return "";
  return v;
}

export function BoxModelWidget({
  marginTop,
  marginRight,
  marginBottom,
  marginLeft,
  paddingTop,
  paddingRight,
  paddingBottom,
  paddingLeft,
  onChangeMargin,
  onChangePadding,
}: BoxModelProps) {
  const [marginLinked, setMarginLinked] = useState(false);
  const [paddingLinked, setPaddingLinked] = useState(false);

  const handleMarginChange = (side: "top" | "right" | "bottom" | "left", val: string) => {
    if (marginLinked) {
      onChangeMargin({ top: val, right: val, bottom: val, left: val });
    } else {
      onChangeMargin({
        top: side === "top" ? val : marginTop,
        right: side === "right" ? val : marginRight,
        bottom: side === "bottom" ? val : marginBottom,
        left: side === "left" ? val : marginLeft,
      });
    }
  };

  const handlePaddingChange = (side: "top" | "right" | "bottom" | "left", val: string) => {
    if (paddingLinked) {
      onChangePadding({ top: val, right: val, bottom: val, left: val });
    } else {
      onChangePadding({
        top: side === "top" ? val : paddingTop,
        right: side === "right" ? val : paddingRight,
        bottom: side === "bottom" ? val : paddingBottom,
        left: side === "left" ? val : paddingLeft,
      });
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[10px] text-text-3 font-semibold uppercase tracking-wider">
        <span>Box Model (Margin & Padding)</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              onChangeMargin({ top: "", right: "", bottom: "", left: "" });
              onChangePadding({ top: "", right: "", bottom: "", left: "" });
            }}
            className="text-[9.5px] text-text-3 hover:text-white flex items-center gap-1 transition-colors"
            title="Reset All Spacing"
          >
            <RotateCcw size={10} /> Reset
          </button>
        </div>
      </div>

      {/* Visual CSS Box Diagram */}
      <div className="relative p-2.5 rounded-xl border border-border-default bg-[#151921] select-none text-[10px] font-mono">
        {/* Margin Box (Outer) */}
        <div className="relative border border-dashed border-amber-500/40 rounded-lg p-2 bg-amber-500/5">
          <div className="absolute top-1 left-2 flex items-center gap-1 text-[9px] font-sans font-bold text-amber-400 uppercase tracking-widest">
            <span>Margin</span>
            <button
              type="button"
              onClick={() => setMarginLinked(!marginLinked)}
              className="p-0.5 rounded hover:bg-amber-500/20 text-amber-400/80 hover:text-amber-400"
              title={marginLinked ? "Unlink margin sides" : "Link all margin sides"}
            >
              {marginLinked ? <Link2 size={10} /> : <Link2Off size={10} />}
            </button>
          </div>

          {/* Margin Top */}
          <div className="flex justify-center mb-1">
            <input
              type="text"
              value={cleanVal(marginTop)}
              onChange={(e) => handleMarginChange("top", e.target.value)}
              placeholder="0px"
              className="w-14 text-center py-0.5 bg-bg-2 border border-border-default hover:border-amber-400 focus:border-amber-400 rounded text-amber-300 text-[10px] outline-none"
            />
          </div>

          <div className="flex items-center justify-between gap-1">
            {/* Margin Left */}
            <input
              type="text"
              value={cleanVal(marginLeft)}
              onChange={(e) => handleMarginChange("left", e.target.value)}
              placeholder="auto"
              className="w-12 text-center py-0.5 bg-bg-2 border border-border-default hover:border-amber-400 focus:border-amber-400 rounded text-amber-300 text-[10px] outline-none"
            />

            {/* Padding Box (Inner) */}
            <div className="flex-1 relative border border-dashed border-emerald-500/40 rounded-md p-2 bg-emerald-500/5">
              <div className="absolute top-1 left-2 flex items-center gap-1 text-[9px] font-sans font-bold text-emerald-400 uppercase tracking-widest">
                <span>Padding</span>
                <button
                  type="button"
                  onClick={() => setPaddingLinked(!paddingLinked)}
                  className="p-0.5 rounded hover:bg-emerald-500/20 text-emerald-400/80 hover:text-emerald-400"
                  title={paddingLinked ? "Unlink padding sides" : "Link all padding sides"}
                >
                  {paddingLinked ? <Link2 size={10} /> : <Link2Off size={10} />}
                </button>
              </div>

              {/* Padding Top */}
              <div className="flex justify-center mb-1">
                <input
                  type="text"
                  value={cleanVal(paddingTop)}
                  onChange={(e) => handlePaddingChange("top", e.target.value)}
                  placeholder="0px"
                  className="w-14 text-center py-0.5 bg-bg-2 border border-border-default hover:border-emerald-400 focus:border-emerald-400 rounded text-emerald-300 text-[10px] outline-none"
                />
              </div>

              <div className="flex items-center justify-between gap-1">
                {/* Padding Left */}
                <input
                  type="text"
                  value={cleanVal(paddingLeft)}
                  onChange={(e) => handlePaddingChange("left", e.target.value)}
                  placeholder="0px"
                  className="w-12 text-center py-0.5 bg-bg-2 border border-border-default hover:border-emerald-400 focus:border-emerald-400 rounded text-emerald-300 text-[10px] outline-none"
                />

                {/* Content Center */}
                <div className="px-3 py-2 rounded bg-blue-500/10 border border-blue-500/30 text-blue-300 font-sans text-center text-[9px] uppercase tracking-wider font-semibold">
                  Content
                </div>

                {/* Padding Right */}
                <input
                  type="text"
                  value={cleanVal(paddingRight)}
                  onChange={(e) => handlePaddingChange("right", e.target.value)}
                  placeholder="0px"
                  className="w-12 text-center py-0.5 bg-bg-2 border border-border-default hover:border-emerald-400 focus:border-emerald-400 rounded text-emerald-300 text-[10px] outline-none"
                />
              </div>

              {/* Padding Bottom */}
              <div className="flex justify-center mt-1">
                <input
                  type="text"
                  value={cleanVal(paddingBottom)}
                  onChange={(e) => handlePaddingChange("bottom", e.target.value)}
                  placeholder="0px"
                  className="w-14 text-center py-0.5 bg-bg-2 border border-border-default hover:border-emerald-400 focus:border-emerald-400 rounded text-emerald-300 text-[10px] outline-none"
                />
              </div>
            </div>

            {/* Margin Right */}
            <input
              type="text"
              value={cleanVal(marginRight)}
              onChange={(e) => handleMarginChange("right", e.target.value)}
              placeholder="auto"
              className="w-12 text-center py-0.5 bg-bg-2 border border-border-default hover:border-amber-400 focus:border-amber-400 rounded text-amber-300 text-[10px] outline-none"
            />
          </div>

          {/* Margin Bottom */}
          <div className="flex justify-center mt-1">
            <input
              type="text"
              value={cleanVal(marginBottom)}
              onChange={(e) => handleMarginChange("bottom", e.target.value)}
              placeholder="0px"
              className="w-14 text-center py-0.5 bg-bg-2 border border-border-default hover:border-amber-400 focus:border-amber-400 rounded text-amber-300 text-[10px] outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
