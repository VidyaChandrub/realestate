import type { Metadata } from "next";
import { ReportsView } from "@/components/reports/reports-view";

export const metadata: Metadata = {
  title: "Reports & Analytics · iPixxel Realty",
  description: "Organisation sales reports, conversion funnel, agent leaderboards, and analytics dashboard",
};

export default function OrgReportsPage() {
  return <ReportsView mode="org" />;
}
