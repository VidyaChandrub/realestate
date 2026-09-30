import type { AttributionLabel, CrmLead } from "./types";

/** Map Organisation Label keys → values on a CRM lead. */
export function leadAttributionValue(
  lead: Partial<CrmLead> & { data?: Record<string, unknown> | null },
  key: string,
): string {
  const data = lead.data && typeof lead.data === "object" ? lead.data : {};
  const fromData = (k: string) => {
    const v = data[k];
    return typeof v === "string" && v.trim() ? v.trim() : "";
  };

  switch (key) {
    case "platform":
      return (lead.platform ?? fromData("platform") ?? "").trim();
    case "source":
      return (lead.source ?? fromData("source") ?? "").trim();
    case "medium":
      return (lead.medium ?? fromData("medium") ?? "").trim();
    case "campaign":
      return (lead.campaign ?? fromData("campaign") ?? "").trim();
    case "campaign_id":
      return (lead.campaignId ?? fromData("campaign_id") ?? "").trim();
    case "ad_set":
      return (lead.adSet ?? fromData("ad_set") ?? "").trim();
    case "ad":
      return (lead.ad ?? fromData("ad") ?? "").trim();
    case "utm_source":
      return (lead.utmSource ?? fromData("utm_source") ?? "").trim();
    case "utm_medium":
      return (lead.utmMedium ?? fromData("utm_medium") ?? "").trim();
    case "utm_campaign":
      return (lead.utmCampaign ?? fromData("utm_campaign") ?? "").trim();
    case "utm_term":
      return (lead.utmTerm ?? fromData("utm_term") ?? "").trim();
    case "utm_content":
      return (lead.utmContent ?? fromData("utm_content") ?? "").trim();
    case "landing_page":
      return (lead.landingPage ?? fromData("landing_page") ?? "").trim();
    case "landing_page_url":
      return (
        lead.landingPageUrl ??
        fromData("landing_page_url") ??
        fromData("landingPageUrl") ??
        ""
      ).trim();
    case "referrer":
      return (lead.referrer ?? fromData("referrer") ?? "").trim();
    case "first_touch_source":
      return (
        lead.firstTouchSource ?? fromData("first_touch_source") ?? ""
      ).trim();
    case "last_touch_source":
      return (
        lead.lastTouchSource ?? fromData("last_touch_source") ?? ""
      ).trim();
    case "fbclid":
      return (lead.fbclid ?? fromData("fbclid") ?? "").trim();
    case "gclid":
      return (lead.gclid ?? fromData("gclid") ?? "").trim();
    default:
      return fromData(key);
  }
}

export function attributionRows(
  lead: Partial<CrmLead> & { data?: Record<string, unknown> | null },
  labels: AttributionLabel[],
): Array<{ key: string; label: string; value: string }> {
  return labels
    .map((l) => ({
      key: l.key,
      label: l.label,
      value: leadAttributionValue(lead, l.key),
    }))
    .filter((row) => row.value);
}
