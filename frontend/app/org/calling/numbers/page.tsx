import { CallingPageHead } from "@/components/org/crm-tabs";

export const metadata = { title: "iPixxel Realty · Calling Numbers" };

export default function OrgCallingNumbersPage() {
  return (
    <>
      <CallingPageHead active="numbers" />
      <div className="card reveal in">
        <div className="card-b" style={{ textAlign: "center", padding: "60px 24px" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔢</div>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Phone Numbers — coming soon</div>
          <p className="muted">Buy and manage caller IDs across regions for your AI calling.</p>
        </div>
      </div>
    </>
  );
}
