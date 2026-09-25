import { BadRequestException } from '@nestjs/common';

// Typed field templates. A template is an ordered array of field definitions
// an org configures per project type (project-level summary fields, and
// per-unit fields). Values are stored elsewhere keyed by `key`, never by
// label, so renaming a label keeps saved values.

export const FIELD_TYPES = ['number', 'text', 'yesno', 'choice'] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

// A role wires a field onto a real Unit column and the feature that column
// powers. At most one field per template may carry a given role. A role is
// fixed once set (never re-assigned by an edit) — only a field's label is
// always editable. Deleting the field that carries a role simply turns that
// feature off (no price shown, flat list, …) — it never errors.
export const FIELD_ROLES = [
  'price',
  'area',
  'group',
  'floor',
  'configuration',
] as const;
export type FieldRole = (typeof FIELD_ROLES)[number];

// The Unit type each role must be storable as, so a role can only land on a
// field whose input type actually fits its column (Unit.floor is an Int,
// Unit.tower/configuration are free text/choice, price/area are numbers).
const ROLE_REQUIRED_TYPES: Record<FieldRole, FieldType[]> = {
  price: ['number'],
  area: ['number'],
  floor: ['number'],
  group: ['text', 'choice'],
  configuration: ['text', 'choice'],
};

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  // Groups fields under a heading in the rendered form. Optional — an
  // unsectioned field renders under no heading.
  section?: string;
  // Wires this field onto a real Unit column and the feature it powers. At
  // most one field per template may carry a given role.
  role?: FieldRole;
  // choice only
  options?: string[];
  // number only — display suffix such as "acres"
  unit?: string;
  // text only — render hint for a textarea instead of a single-line input.
  multiline?: boolean;
  // number, non-role fields only — an explicit opt-in to also get a column in
  // "Defaults per configuration" and prefill on Add Unit the same way Price
  // and Area do. Never inferred from the field's name.
  extraDefault?: boolean;
}

export const MAX_TEMPLATE_FIELDS = 40;
const KEY_RE = /^[a-z][a-z0-9_]{0,39}$/;

/** The field currently carrying `role` in a template, or null. */
export function roleField(template: FieldDef[], role: FieldRole): FieldDef | null {
  return template.find((f) => f.role === role) ?? null;
}

/**
 * The fields whose values belong in `customFields` — a role field's value
 * lives on its own dedicated Unit column instead, so it's never valid inside
 * `customFields` (an incoming key for one is rejected as unknown, same as
 * any other key not in the template).
 */
export function nonRoleFields(template: FieldDef[]): FieldDef[] {
  return template.filter((f) => !f.role);
}

/** What a template's role fields give a project. Derived, never stored. */
export interface TemplateTraits {
  /** A price-role field exists. */
  priced: boolean;
  /** An area-role field exists (powers price per unit area). */
  hasArea: boolean;
  /** Floors are captured (a floor-role field exists). */
  floors: boolean;
  /** The unit-configuration mix (planned counts, size/price defaults). */
  configurations: boolean;
  /** Units are organised into named groups. */
  grouped: boolean;
}

export function templateTraits(template: FieldDef[]): TemplateTraits {
  return {
    priced: !!roleField(template, 'price'),
    hasArea: !!roleField(template, 'area'),
    floors: !!roleField(template, 'floor'),
    configurations: !!roleField(template, 'configuration'),
    grouped: !!roleField(template, 'group'),
  };
}

/** The grouping column's name for a project — the `group`-role field's own
 *  editable label; null when the template has no `group`-role field. */
export function groupNoun(template: FieldDef[]): string | null {
  return roleField(template, 'group')?.label ?? null;
}

export function slugifyFieldKey(label: string): string {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
  return /^[a-z]/.test(slug) ? slug : `f_${slug}`.slice(0, 40);
}

/**
 * Validates and normalises a template. Keys the client supplied are kept
 * (they are the stable identity of a field); a missing key is generated from
 * the label. Throws 400 on anything malformed, so a template that reaches the
 * database is always well-formed regardless of which client sent it.
 */
export function normalizeFieldTemplate(input: unknown): FieldDef[] {
  if (!Array.isArray(input)) {
    throw new BadRequestException('A field template must be a list of fields');
  }
  if (input.length > MAX_TEMPLATE_FIELDS) {
    throw new BadRequestException(
      `A template can have at most ${MAX_TEMPLATE_FIELDS} fields`,
    );
  }
  const seenKeys = new Set<string>();
  const seenLabels = new Set<string>();
  const seenRoles = new Set<FieldRole>();
  return input.map((raw: unknown, i) => {
    const n = i + 1;
    if (typeof raw !== 'object' || raw === null) {
      throw new BadRequestException(`Field ${n} is invalid`);
    }
    const f = raw as Record<string, unknown>;
    const label = typeof f.label === 'string' ? f.label.trim() : '';
    if (!label) throw new BadRequestException(`Field ${n} needs a label`);
    if (label.length > 80) {
      throw new BadRequestException(`"${label.slice(0, 20)}…" is too long (max 80)`);
    }
    if (seenLabels.has(label.toLowerCase())) {
      throw new BadRequestException(`Two fields are both called "${label}"`);
    }
    seenLabels.add(label.toLowerCase());

    if (!FIELD_TYPES.includes(f.type as FieldType)) {
      throw new BadRequestException(`"${label}" has an unknown type`);
    }
    const type = f.type as FieldType;

    const supplied = typeof f.key === 'string' && f.key ? f.key : null;
    let key = supplied ?? slugifyFieldKey(label);
    if (!KEY_RE.test(key)) {
      throw new BadRequestException(`"${label}" has an invalid key`);
    }
    if (seenKeys.has(key)) {
      if (supplied) {
        throw new BadRequestException(`Duplicate field key "${key}"`);
      }
      const base = key.slice(0, 36);
      let suffix = 2;
      while (seenKeys.has(`${base}_${suffix}`)) suffix++;
      key = `${base}_${suffix}`;
    }
    seenKeys.add(key);

    const def: FieldDef = { key, label, type, required: f.required === true };

    if (typeof f.section === 'string' && f.section.trim()) {
      const section = f.section.trim();
      if (section.length > 60) {
        throw new BadRequestException(`"${label}" section name is too long (max 60)`);
      }
      def.section = section;
    }

    if (f.role !== undefined && f.role !== null) {
      if (!FIELD_ROLES.includes(f.role as FieldRole)) {
        throw new BadRequestException(`"${label}" has an unknown role`);
      }
      const role = f.role as FieldRole;
      if (seenRoles.has(role)) {
        throw new BadRequestException(`Two fields can't both be the "${role}" field`);
      }
      if (!ROLE_REQUIRED_TYPES[role].includes(type)) {
        throw new BadRequestException(
          `"${label}" can't be the "${role}" field — it must be ${ROLE_REQUIRED_TYPES[role].join(' or ')}`,
        );
      }
      seenRoles.add(role);
      def.role = role;
    }

    if (type === 'choice') {
      const opts = Array.isArray(f.options)
        ? f.options
            .map((o) => (typeof o === 'string' ? o.trim() : ''))
            .filter(Boolean)
        : [];
      const unique = Array.from(new Set(opts));
      if (unique.length === 0) {
        throw new BadRequestException(`"${label}" needs at least one choice`);
      }
      if (unique.some((o) => o.length > 80) || unique.length > 50) {
        throw new BadRequestException(
          `"${label}" has too many or too long choices`,
        );
      }
      def.options = unique;
    }
    if (type === 'number' && typeof f.unit === 'string' && f.unit.trim()) {
      const unit = f.unit.trim();
      if (unit.length > 20) {
        throw new BadRequestException(`"${label}" unit is too long (max 20)`);
      }
      def.unit = unit;
    }
    if (type === 'text' && f.multiline === true) {
      def.multiline = true;
    }
    if (type === 'number' && !def.role && f.extraDefault === true) {
      def.extraDefault = true;
    }
    return def;
  });
}

export type CustomValues = Record<string, string | number | boolean | null>;

const isEmpty = (v: unknown) =>
  v === undefined || v === null || (typeof v === 'string' && v.trim() === '');

/**
 * Validates typed values against a template and returns what to store.
 *
 * - Every incoming key must be in the template (unknown keys are rejected),
 *   and its value must match the field's type: number → finite number,
 *   text → string (max 500), yesno → boolean, choice → one of the options.
 *   An empty value clears the field.
 * - `existing` are the values already stored. Keys no longer in the template
 *   are kept untouched (removing a field never deletes saved data), and a
 *   choice value that is no longer among the options is accepted only if it
 *   is unchanged.
 * - Required fields: a value can't be cleared, and `requireAll` (used when a
 *   record is created) additionally demands every required field be filled.
 *   A required field added to the template later stays empty on old records
 *   until someone fills it — old records are never retroactively blocked.
 */
export function validateCustomValues(
  template: FieldDef[],
  incoming: unknown,
  existing: CustomValues = {},
  requireAll = false,
): CustomValues {
  if (incoming !== undefined && (typeof incoming !== 'object' || incoming === null || Array.isArray(incoming))) {
    throw new BadRequestException('Custom fields must be an object of values');
  }
  const values = (incoming ?? {}) as Record<string, unknown>;
  const byKey = new Map(template.map((f) => [f.key, f]));

  for (const key of Object.keys(values)) {
    if (!byKey.has(key)) {
      throw new BadRequestException(`Unknown field "${key}"`);
    }
  }

  const result: CustomValues = {};
  // Values of fields that have left the template stay as they were.
  for (const [key, v] of Object.entries(existing)) {
    if (!byKey.has(key)) result[key] = v;
  }

  for (const f of template) {
    const sent = Object.prototype.hasOwnProperty.call(values, f.key);
    const raw = sent ? values[f.key] : existing[f.key];
    const had = !isEmpty(existing[f.key]);

    if (isEmpty(raw)) {
      if (f.required && (requireAll || (sent && had))) {
        throw new BadRequestException(`"${f.label}" is required`);
      }
      continue;
    }
    if (!sent) {
      result[f.key] = existing[f.key] as string | number | boolean;
      continue;
    }

    switch (f.type) {
      case 'number':
        if (typeof raw !== 'number' || !Number.isFinite(raw)) {
          throw new BadRequestException(`"${f.label}" must be a number`);
        }
        result[f.key] = raw;
        break;
      case 'text': {
        const max = f.multiline ? 2000 : 500;
        if (typeof raw !== 'string' || raw.length > max) {
          throw new BadRequestException(`"${f.label}" must be text of at most ${max} characters`);
        }
        result[f.key] = raw.trim();
        break;
      }
      case 'yesno':
        if (typeof raw !== 'boolean') {
          throw new BadRequestException(`"${f.label}" must be yes or no`);
        }
        result[f.key] = raw;
        break;
      case 'choice':
        if (
          typeof raw !== 'string' ||
          !(f.options ?? []).includes(raw) && raw !== existing[f.key]
        ) {
          throw new BadRequestException(`"${f.label}" must be one of its listed choices`);
        }
        result[f.key] = raw;
        break;
    }
  }
  return result;
}
