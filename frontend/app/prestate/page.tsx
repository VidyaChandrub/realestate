import { Suspense } from "react";
import { PrestateStudio } from "@/components/prestate/studio";

export default function PrestatePage() {
  return (
    <Suspense fallback={<div className="ps-studio-root"><div className="ps-studio-boot">Opening builder…</div></div>}>
      <PrestateStudio />
    </Suspense>
  );
}
