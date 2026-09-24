import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "../openpage.css";

const roboto = Roboto({
  weight: ["300", "400", "500", "700", "900"],
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Local preview",
  description: "Local landing page preview",
};

export default function LocalPreviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${roboto.variable} ${roboto.className}`}
      style={
        {
          ["--font-playfair" as string]: "var(--font-inter), Roboto, sans-serif",
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}
