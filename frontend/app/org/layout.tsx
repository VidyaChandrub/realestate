import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Roboto } from "next/font/google";
import { OrgAdminShell } from "@/components/org/shell";
import "./org.css";

const roboto = Roboto({
  weight: ["300", "400", "500", "700", "900"],
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "iPixxel Realty · Organisation",
  description: "Organisation admin console for the iPixxel Realty platform",
};

export default function OrgLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`org ${roboto.variable} ${roboto.className}`}
      style={
        {
          ["--font-space-grotesk" as string]:
            "var(--font-inter), Roboto, sans-serif",
        } as React.CSSProperties
      }
    >
      <OrgAdminShell>{children}</OrgAdminShell>
    </div>
  );
}
