const NAME_KEYS = [
  'fullName',
  'full_name',
  'name',
  'Name',
  'Full Name',
  'Full name',
  'Your Name',
  'Your name',
  'full name',
];
const PHONE_KEYS = [
  'phone',
  'phoneNumber',
  'phone_number',
  'Phone',
  'Phone Number',
  'Phone number',
  'phone number',
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
  'Email address',
  'email_address',
];
const PROJECT_KEYS = ['project', 'Project', 'projectName', 'Project Name'];
const UNIT_KEYS = ['unitId', 'Unit ID', 'unit_id', 'UnitId'];
const INTEREST_KEYS = [
  'interestedIn',
  'Interested in',
  'interested_in',
  'Interest',
  'Configuration',
];

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

function firstMatching(
  data: Record<string, unknown>,
  pattern: RegExp,
  skip: RegExp,
): string | null {
  for (const [key, value] of Object.entries(data)) {
    if (skip.test(key)) continue;
    if (typeof value === 'string' && value.trim() && pattern.test(key)) {
      return value.trim();
    }
  }
  return null;
}

export function normalizeLeadData(
  data: Record<string, unknown>,
  extras?: { unitId?: string | null; projectName?: string | null },
): Record<string, unknown> {
  const next = { ...data };
  const skip = /project|unit|form|source|id$/i;
  const fullName =
    firstString(data, NAME_KEYS) ?? firstMatching(data, /\bname\b/i, skip);
  const phone =
    firstString(data, PHONE_KEYS) ??
    firstMatching(data, /phone|mobile|whatsapp/i, skip);
  const email =
    firstString(data, EMAIL_KEYS) ?? firstMatching(data, /email/i, skip);
  const project = extras?.projectName ?? firstString(data, PROJECT_KEYS);
  const unitId = extras?.unitId ?? firstString(data, UNIT_KEYS);
  const interestedIn =
    firstString(data, INTEREST_KEYS) ??
    firstMatching(data, /interest|configuration|bhk/i, skip);

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
  if (interestedIn) next.interestedIn = interestedIn;
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
