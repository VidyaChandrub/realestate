const NAME_KEYS = [
  'fullName',
  'full_name',
  'name',
  'Name',
  'Full Name',
  'Your Name',
  'full name',
];
const PHONE_KEYS = [
  'phone',
  'phoneNumber',
  'phone_number',
  'Phone',
  'Mobile',
  'mobile',
  'WhatsApp',
  'whatsapp',
];
const EMAIL_KEYS = [
  'email',
  'Email',
  'emailAddress',
  'Email Address',
  'email_address',
];
const PROJECT_KEYS = ['project', 'Project', 'projectName', 'Project Name'];
const UNIT_KEYS = ['unitId', 'Unit ID', 'unit_id', 'UnitId'];

function firstString(
  data: Record<string, unknown>,
  keys: string[],
): string | null {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

export function normalizeLeadData(
  data: Record<string, unknown>,
  extras?: { unitId?: string | null; projectName?: string | null },
): Record<string, unknown> {
  const next = { ...data };
  const fullName = firstString(data, NAME_KEYS);
  const phone = firstString(data, PHONE_KEYS);
  const email = firstString(data, EMAIL_KEYS);
  const project = extras?.projectName ?? firstString(data, PROJECT_KEYS);
  const unitId = extras?.unitId ?? firstString(data, UNIT_KEYS);

  if (fullName) {
    next.fullName = fullName;
    if (!next.name) next.name = fullName;
  }
  if (phone) {
    next.phone = phone;
    if (!next.phoneNumber) next.phoneNumber = phone;
  }
  if (email) next.email = email;
  if (project) next.project = project;
  if (unitId) next.unitId = unitId;
  return next;
}

export function leadContactFromData(data: Record<string, unknown>): {
  fullName: string | null;
  phone: string | null;
  email: string | null;
} {
  return {
    fullName: firstString(data, NAME_KEYS),
    phone: firstString(data, PHONE_KEYS),
    email: firstString(data, EMAIL_KEYS),
  };
}
