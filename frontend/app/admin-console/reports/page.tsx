import type { Metadata } from "next";
import { ReportsView } from "@/components/reports/reports-view";

export const metadata: Metadata = {
  title: "Reports & Analytics · Super Admin",
  description: "Platform wide reports, lead conversion metrics, agent leaderboards, and project analytics",
};

export default function AdminReportsPage() {
  return <ReportsView mode="admin" />;
}
