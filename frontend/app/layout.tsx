import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Roboto, Roboto_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { ToastProvider } from "@/components/ui/toast";
import { GlobalThemeProvider } from "@/components/global-theme-provider";

const roboto = Roboto({
  weight: ["300", "400", "500", "700", "900"],
  subsets: ["latin"],
  variable: "--font-roboto",
});

const robotoMono = Roboto_Mono({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-roboto-mono",
});

export const metadata: Metadata = {
  title: "iPixxel Realty",
  description: "Real estate SaaS platform",
};

const fontVars = {
  ["--font-inter"]: "var(--font-roboto), Roboto, sans-serif",
  ["--font-space-grotesk"]: "var(--font-roboto), Roboto, sans-serif",
  ["--font-geist-sans"]: "var(--font-roboto), Roboto, sans-serif",
  ["--font-geist-mono"]: "var(--font-roboto-mono), 'Roboto Mono', monospace",
  ["--font-playfair"]: "var(--font-roboto), Roboto, sans-serif",
  ["--font-mono"]: "var(--font-roboto-mono), 'Roboto Mono', monospace",
} as CSSProperties;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${roboto.variable} ${robotoMono.variable} h-full antialiased`}
      style={fontVars}
      suppressHydrationWarning
    >
      <body className={`${roboto.className} min-h-full flex flex-col`} suppressHydrationWarning>
        <AuthProvider>
          <GlobalThemeProvider>
            <ToastProvider>{children}</ToastProvider>
          </GlobalThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
