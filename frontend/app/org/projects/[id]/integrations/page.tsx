"use client";

import { useAuth } from "@/lib/auth-context";
import { PROJECT_LEAD_ACTION } from "@/lib/permissions";
import { Reveal } from "@/components/superadmin/reveal";
import { ProjectPageHead } from "@/components/org/project-tabs";
import { MetaLeadAdsCard } from "@/components/org/meta-lead-ads-card";
import "@/app/org/org.css";

export default function OrgProjectIntegrationsPage() {
  const { hasPermission } = useAuth();
  const canAddLead = hasPermission("projects", PROJECT_LEAD_ACTION);
  return (
    <>
      <ProjectPageHead
        active="integrations"
        actions={
          canAddLead ? <button className="btn btn-primary">＋ Add lead</button> : null
        }
      />

      <Reveal delay={1}>
        <div className="help mb-14">
          Connect Facebook Lead Ads so form submissions sync into Lead Center with
          full campaign attribution. Website and landing-page leads already land in
          the same inbox.
        </div>
      </Reveal>

      <Reveal delay={2}>
        <MetaLeadAdsCard />
      </Reveal>
    </>
  );
}
