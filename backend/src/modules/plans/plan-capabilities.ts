import {
  registerDecorator,
  type ValidationOptions,
} from 'class-validator';

/**
 * THE canonical list of plan capability flags. This is the single source of
 * truth: the DTO validators reject any capability key not in here, the plan
 * editor renders a checkbox per entry, and the comparison matrix renders one
 * row per entry. The frontend gets it from `GET /admin/plans/capabilities`
 * rather than re-declaring it, so the two can't drift.
 *
 * Seeded from the old hardcoded `ALL_FEATURES` matrix list, minus Projects /
 * Users / Templates (those are numeric `limits`, not booleans).
 *
 * `Plan.capabilities` is `{ <key>: boolean }`. A missing key means `false`.
 */
export interface PlanCapabilityDef {
  key: string;
  label: string;
  description: string;
}

export const PLAN_CAPABILITY_CATALOG: readonly PlanCapabilityDef[] = [
  {
    key: 'customDomain',
    label: 'Custom domain',
    description: "Map the organisation's own domain to its published site.",
  },
  {
    key: 'emailSupport',
    label: 'Email support',
    description: 'Support requests answered over email.',
  },
  {
    key: 'prioritySupport',
    label: 'Priority support',
    description: 'Faster response times and priority routing for tickets.',
  },
  {
    key: 'dedicatedManager',
    label: 'Dedicated manager',
    description: 'A named account manager assigned to the organisation.',
  },
  {
    key: 'whatsappIntegration',
    label: 'WhatsApp integration',
    description: 'Send and receive WhatsApp messages from the CRM.',
  },
  {
    key: 'customBranding',
    label: 'Custom branding',
    description: "Replace platform branding with the organisation's own logo and colours.",
  },
  {
    key: 'apiAccess',
    label: 'API access',
    description: 'Programmatic access to the platform via API keys.',
  },
  {
    key: 'whiteLabel',
    label: 'White-label',
    description: 'Fully unbranded product suitable for reselling.',
  },
  {
    key: 'ssoAndSla',
    label: 'SSO & SLA',
    description: 'Single sign-on and a contractual uptime SLA.',
  },
  {
    key: 'auditLogs',
    label: 'Audit logs',
    description: 'Exportable log of security and administrative events.',
  },
  {
    key: 'advancedAnalytics',
    label: 'Advanced analytics',
    description: 'Deeper reporting and configurable dashboards.',
  },
] as const;

export const PLAN_CAPABILITY_KEYS: readonly string[] =
  PLAN_CAPABILITY_CATALOG.map((c) => c.key);

const PLAN_CAPABILITY_KEY_SET = new Set(PLAN_CAPABILITY_KEYS);

/** True when `value` is `{ <catalog key>: boolean }` (or null/undefined). */
export function isValidCapabilityMap(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.entries(value as Record<string, unknown>).every(
    ([k, v]) => PLAN_CAPABILITY_KEY_SET.has(k) && typeof v === 'boolean',
  );
}

/** Keep only catalog keys, coerce values to boolean. */
export function normalizeCapabilityMap(
  value: unknown,
): Record<string, boolean> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (PLAN_CAPABILITY_KEY_SET.has(k)) out[k] = Boolean(v);
  }
  return out;
}

/**
 * class-validator decorator: the property must be an object whose keys are all
 * in the capability catalog and whose values are all booleans. Unknown keys
 * fail validation (they are not stored silently).
 */
export function IsPlanCapabilityMap(options?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isPlanCapabilityMap',
      target: object.constructor,
      propertyName,
      options,
      validator: {
        validate(value: unknown) {
          return isValidCapabilityMap(value);
        },
        defaultMessage() {
          return `capabilities must be an object of { <capability key>: boolean }. Allowed keys: ${PLAN_CAPABILITY_KEYS.join(
            ', ',
          )}`;
        },
      },
    });
  };
}
