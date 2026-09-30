// Shared by the Organisation Roles list and its create / edit pages.

export const ROLES_PATH = "/admin-console/roles";
export const ROLES_FLASH_KEY = "adminRoles.flash";

export const SYSTEM_ROLE_KEYS = ["super_admin", "admin", "manager", "sales", "telecaller"];

export const ORG_PRESETS = [
  { name: "Senior Telecaller", key: "senior_telecaller", desc: "Manages lead qualification, calling, and follow-ups" },
  { name: "Sales Team Lead", key: "sales_team_lead", desc: "Oversees sales agent pipeline, assignment, and site visits" },
  { name: "Site Visit Manager", key: "site_visit_manager", desc: "Coordinates property site tours and customer feedback" },
  { name: "Project Admin", key: "project_admin", desc: "Manages real estate project listings, units, and inventory" },
];

/** Same wording as the API's "role still has users" refusal. */
export function roleInUseMessage(roleName: string, users: number, action: string) {
  const who = users === 1 ? "1 user" : `${users} users`;
  return `Role '${roleName}' is assigned to ${who}. Remove or reassign ${users === 1 ? "that user" : "those users"} first, then you can ${action}.`;
}
