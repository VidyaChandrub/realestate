import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter, Space_Grotesk } from "next/font/google";
import { OrgAdminShell } from "@/components/org/shell";
import "../admin-console/superadmin.css";
import "./crm.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

export const metadata: Metadata = {
  title: "iPixxel Realty · Organisation",
  description: "Organisation admin console for the iPixxel Realty platform",
};

export default function OrgLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`superadmin ${inter.variable} ${spaceGrotesk.variable}`}>
      <OrgAdminShell>{children}</OrgAdminShell>
    </div>
  );
}
