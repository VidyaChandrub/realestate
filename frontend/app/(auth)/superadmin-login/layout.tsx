import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter, Space_Grotesk } from "next/font/google";
import "../../superadmin/superadmin.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

export const metadata: Metadata = {
  title: "Sign in · iPixxel Realty Super Admin",
  description: "Restricted platform access",
};

export default function SuperAdminLoginLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`superadmin ${inter.variable} ${spaceGrotesk.variable}`}>
      {children}
    </div>
  );
}
