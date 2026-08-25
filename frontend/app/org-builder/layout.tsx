import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "@/app/prestate/prestate.css";

// Mirrors app/prestate/layout.tsx exactly. This has to be a top-level
// sibling route, not nested under app/org/ — app/org/layout.tsx
// unconditionally wraps every child in <OrgAdminShell>, and the builder is
// its own full-screen app with its own chrome (rail nav + topnav), never
// meant to render inside a dashboard shell. Nesting it there previously
// produced two overlapping sidebars. Also, prestate.css's rules depend on
// the --font-inter/--font-playfair variables and the ps-app class set up
// here — importing the stylesheet alone (what app/org/builder/page.tsx used
// to do) isn't enough without this wrapper.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Prestate Builder",
  description: "Edit your organisation's landing pages.",
};

export default function OrgBuilderLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`ps-app ${inter.variable} ${playfair.variable}`}>
      {children}
    </div>
  );
}
