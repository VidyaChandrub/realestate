import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  async redirects() {
    return [
      { source: "/superadmin", destination: "/admin-console", permanent: false },
      { source: "/superadmin/:path*", destination: "/admin-console/:path*", permanent: false },
      { source: "/admin-console/login", destination: "/admin-login", permanent: false },
      { source: "/superadmin/login", destination: "/admin-login", permanent: false },
      { source: "/admin-console/onboarding", destination: "/admin-console/approvals", permanent: false },
      { source: "/admin-console/onboarding/:path*", destination: "/admin-console/approvals", permanent: false },
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