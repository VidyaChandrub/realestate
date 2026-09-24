import type { ReactNode } from "react";

type AuthShellProps = {
  variant?: "organisation" | "platform";
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  brandName?: string;
  logoUrl?: string | null;
};

const ORG_COPY = {
  kicker: "Property sales CRM",
  headline: "From first enquiry to site visit.",
  body: "Capture every Meta, Google and WhatsApp lead — then run call centre follow-ups in one pipeline.",
  highlights: [
    { label: "Leads", value: "Ads & landing pages" },
    { label: "Follow-up", value: "Calls & WhatsApp" },
    { label: "Pipeline", value: "New → Won" },
  ],
  trust: "Skyline Developers · Green Acres · Dubai Prime Estates",
};

const PLATFORM_COPY = {
  kicker: "Platform operations",
  headline: "Control the whole estate.",
  body: "Manage organisations, plans and platform users from one console.",
  highlights: [
    { label: "Orgs", value: "Plans & billing" },
    { label: "Users", value: "Platform team" },
    { label: "Security", value: "Access control" },
  ],
  trust: "iPixxel Realty · Platform console",
};

// Shared shell for every auth page. Left: full-bleed property hero with a
// bottom content dock. Right: sign-in form.
export function AuthShell({
  variant = "organisation",
  eyebrow,
  title,
  subtitle,
  children,
  footer,
  brandName,
  logoUrl,
}: AuthShellProps) {
  const copy = variant === "platform" ? PLATFORM_COPY : ORG_COPY;
  const isPlatform = variant === "platform";
  const name = brandName || "iPixxel Realty";
  const logoFallback = (brandName ? brandName.slice(0, 2) : "iR").toUpperCase();

  return (
    <div className={`auth2${isPlatform ? " auth2--platform" : ""}`}>
      <aside className="auth2-brandside">
        <div className="auth2-photo" aria-hidden />
        <div className="auth2-scrim" aria-hidden />
        <div className="auth2-frame" aria-hidden />

        <header className="auth2-brand">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={name}
              style={{ width: 46, height: 46, borderRadius: 12, objectFit: "contain", background: "rgba(255,255,255,0.08)" }}
            />
          ) : (
            <span className="auth2-logo" aria-hidden>
              {logoFallback}
            </span>
          )}
          <div className="auth2-brand-text">
            <span className="auth2-name">{name}</span>
            {isPlatform ? (
              <span className="auth2-badge">Platform</span>
            ) : (
              <span className="auth2-tagline">Property CRM</span>
            )}
          </div>
        </header>

        <div className="auth2-dock">
          <p className="auth2-kicker">{copy.kicker}</p>
          <h2>{copy.headline}</h2>
          <p className="auth2-lead">{copy.body}</p>

          <div className="auth2-highlights">
            {copy.highlights.map((item) => (
              <div key={item.label} className="auth2-hl">
                <span className="auth2-hl-label">{item.label}</span>
                <span className="auth2-hl-value">{item.value}</span>
              </div>
            ))}
          </div>

          <p className="auth2-trust">{copy.trust}</p>
        </div>
      </aside>

      <main className="auth2-formside">
        <div className="auth2-mobile-brand">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={name}
              style={{ width: 36, height: 36, borderRadius: 10, objectFit: "contain" }}
            />
          ) : (
            <span className="auth2-logo" aria-hidden>
              {logoFallback}
            </span>
          )}
          <span className="auth2-name">{name}</span>
        </div>
        <div className="auth2-card">
          {eyebrow ? <span className="auth2-eyebrow">{eyebrow}</span> : null}
          <h1>{title}</h1>
          {subtitle ? <p className="auth2-sub">{subtitle}</p> : null}
          {children}
        </div>
        {footer ? <footer className="auth2-footer">{footer}</footer> : null}
      </main>
    </div>
  );
}
