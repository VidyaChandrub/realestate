import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./prestate.css";

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
  description: "High-converting real estate landing page builder.",
};

export default function PrestateLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`ps-app ${inter.variable} ${playfair.variable}`}>
      {children}
    </div>
  );
}
