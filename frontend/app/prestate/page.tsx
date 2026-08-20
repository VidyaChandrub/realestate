import { Suspense } from "react";
import { PrestateStudio } from "@/components/prestate/studio";

export default function PrestatePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#0c0e14", color: "#8b92a5", padding: 40 }}>Opening builder…</div>}>
      <PrestateStudio />
    </Suspense>
  );
}
