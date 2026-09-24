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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var t = localStorage.getItem("ipixxel_platform_theme");
                if (t) {
                  var p = JSON.parse(t);
                  var prim = p.primaryColor || "#0f1424";
                  var sec = p.secondaryColor || "#2a3348";
                  var r = document.documentElement;
                  r.style.setProperty("--primary", prim);
                  r.style.setProperty("--secondary", sec);
                  r.style.setProperty("--brand", prim);
                  r.style.setProperty("--iris", sec);
                  r.style.setProperty("--sidebar", "#090e1a");
                  r.style.setProperty("--sidebar-2", "#060a12");
                  r.style.setProperty("--ps-primary", prim);
                  r.style.setProperty("--ps-secondary", sec);
                  r.style.setProperty("--color-primary", prim);
                  r.style.setProperty("--color-secondary", sec);
                  r.style.setProperty("--color-brand", prim);
                  r.style.setProperty("--primary-dark", "color-mix(in srgb, " + prim + " 85%, black)");
                  r.style.setProperty("--primary-soft", "color-mix(in srgb, " + prim + " 6%, white)");
                  r.style.setProperty("--primary-border", "color-mix(in srgb, " + prim + " 15%, white)");
                  r.style.setProperty("--brand-600", "color-mix(in srgb, " + prim + " 85%, black)");
                  r.style.setProperty("--brand-050", "color-mix(in srgb, " + prim + " 6%, white)");
                  r.style.setProperty("--brand-100", "color-mix(in srgb, " + prim + " 15%, white)");
                  r.style.setProperty("--secondary-050", "color-mix(in srgb, " + sec + " 8%, white)");
                  r.style.setProperty("--secondary-100", "color-mix(in srgb, " + sec + " 18%, white)");
                  r.style.setProperty("--sh-glow", "0 10px 28px -10px color-mix(in srgb, " + prim + " 45%, transparent)");
                }
              } catch(e) {}
            `,
          }}
        />
      </head>
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
