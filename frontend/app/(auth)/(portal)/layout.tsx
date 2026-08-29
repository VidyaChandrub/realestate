import type { ReactNode } from "react";
import "../../admin-console/superadmin.css";
import "./auth.css";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <div className="superadmin">{children}</div>;
}
