import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Roboto } from "next/font/google";
import { SuperAdminShell } from "@/components/superadmin/shell";
import "./superadmin.css";

const roboto = Roboto({
  weight: ["300", "400", "500", "700", "900"],
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "iPixxel Realty · Super Admin",
  description: "Super admin console for the iPixxel Realty platform",
};

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`superadmin ${roboto.variable} ${roboto.className}`}
      style={
        {
          ["--font-space-grotesk" as string]:
            "var(--font-inter), Roboto, sans-serif",
        } as React.CSSProperties
      }
    >
      <SuperAdminShell>{children}</SuperAdminShell>
    </div>
  );
}
