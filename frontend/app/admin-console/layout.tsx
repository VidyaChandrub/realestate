import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter, Space_Grotesk } from "next/font/google";
import { SuperAdminShell } from "@/components/superadmin/shell";
import "./superadmin.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

export const metadata: Metadata = {
  title: "iPixxel Realty · Super Admin",
  description: "Super admin console for the iPixxel Realty platform",
};

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`superadmin ${inter.variable} ${spaceGrotesk.variable}`}>
      <SuperAdminShell>{children}</SuperAdminShell>
    </div>
  );
}
