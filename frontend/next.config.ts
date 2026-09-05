import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  typescript: { ignoreBuildErrors: true },
  async redirects() {
    return [
      { source: "/superadmin", destination: "/admin-console", permanent: false },
      { source: "/superadmin/:path*", destination: "/admin-console/:path*", permanent: false },
      { source: "/admin-console/login", destination: "/admin-login", permanent: false },
      { source: "/admin-console/onboarding", destination: "/admin-console/organisations", permanent: false },
      { source: "/admin-console/onboarding/:path*", destination: "/admin-console/organisations", permanent: false },
      { source: "/admin-console/approvals", destination: "/admin-console/organisations", permanent: false },
      { source: "/admin-console/approvals/:path*", destination: "/admin-console/organisations", permanent: false },
      { source: "/auth/login", destination: "/login", permanent: false },
      { source: "/auth/forgot-password", destination: "/forgot-password", permanent: false },
      { source: "/auth/reset-password", destination: "/reset-password", permanent: false },
      { source: "/auth/register", destination: "/register", permanent: false },
      { source: "/auth/verify-email", destination: "/verify-email", permanent: false },
    ];
  },
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL ?? "http://localhost:3000";
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;