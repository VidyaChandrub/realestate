import type { ReactNode } from "react";
import "../admin-console/superadmin.css";
import "../(auth)/(portal)/auth.css";

export default function AdminLoginLayout({ children }: { children: ReactNode }) {
  return <div className="superadmin">{children}</div>;
}
