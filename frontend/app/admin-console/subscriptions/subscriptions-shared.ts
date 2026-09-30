// Shared by the Subscriptions studio and its create / edit / assign / change
// pages.

export const SUBS_PATH = "/admin-console/subscriptions";
export const SUBS_FLASH_KEY = "adminSubscriptions.flash";

/** Studio tab indexes the pages send the list back to (see visibleTabs). */
export const PLANS_TAB = "1";
export const ORG_SUBS_TAB = "2";

export type LimitKey = "projects" | "users" | "templates" | "landingPages" | "landingPagesCreate";

export const LIMIT_ROWS: { key: LimitKey; label: string }[] = [
  { key: "projects", label: "Projects" },
  { key: "users", label: "Users" },
  { key: "templates", label: "Templates" },
  { key: "landingPagesCreate", label: "Created Landing Pages (Drafts + Live)" },
  { key: "landingPages", label: "Maximum Published Landing Pages" },
];
