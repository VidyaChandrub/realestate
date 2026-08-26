import { CallingPageHead } from "@/components/org/crm-tabs";

export const metadata = { title: "iPixxel Realty · Voice Lab" };

export default function OrgCallingVoiceLabPage() {
  return (
    <>
      <CallingPageHead active="voice-lab" />
      <div className="card reveal in">
        <div className="card-b" style={{ textAlign: "center", padding: "60px 24px" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎙️</div>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Voice Lab — coming soon</div>
          <p className="muted">Design, clone and fine-tune your AI agent voices here.</p>
        </div>
      </div>
    </>
  );
}
