import type { Employer, MasterDataItem } from '@/types';

export type EmployerEditForm = {
  name: string;
  industry: string;
  website: string;
  foundedYear: string;
  companySize: string;
  type: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  postalCode: string;
  logoUrl: string;
  country: string;
  state: string;
  city: string;
  description: string;
  mission: string;
  vision: string;
  cultureDescription: string;
  benefits: string[];
};

export type EmployerUpdatePayload = Partial<Record<keyof EmployerEditForm, string | string[] | number | null>>;

export type LocationSearchTerms = {
  country: string;
  state: string;
  city: string;
};

export const emptyLocationSearchTerms: LocationSearchTerms = {
  country: '',
  state: '',
  city: '',
};

const editableKeys: (keyof EmployerEditForm)[] = [
  'name',
  'industry',
  'website',
  'foundedYear',
  'companySize',
  'type',
  'contactEmail',
  'contactPhone',
  'address',
  'postalCode',
  'logoUrl',
  'country',
  'state',
  'city',
  'description',
  'mission',
  'vision',
  'cultureDescription',
  'benefits',
];


export const normalizeLocationValue = (value?: string | null) => (value ?? '').trim().toLowerCase();

export const findMasterDataByValue = (items: MasterDataItem[], value?: string | null) => {
  const normalizedValue = normalizeLocationValue(value);
  if (!normalizedValue) return undefined;

  return items.find((item) => normalizeLocationValue(item.value) === normalizedValue);
};

export const uniqueMasterDataItems = (items: MasterDataItem[]) => {
  const seen = new Set<string>();

  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
};

export const withSelectedMasterDataItem = (
  items: MasterDataItem[],
  selectedItem?: MasterDataItem | null
) => (selectedItem ? uniqueMasterDataItems([selectedItem, ...items]) : items);

export function makeEmployerEditForm(employer: Employer): EmployerEditForm {
  return {
    name: employer.name ?? '',
    industry: employer.industry ?? '',
    website: employer.website ?? '',
    foundedYear: (employer as Employer & { foundedYear?: number }).foundedYear ? String((employer as Employer & { foundedYear?: number }).foundedYear) : '',
    companySize: (employer as Employer & { companySize?: string }).companySize ?? '',
    type: (employer as Employer & { type?: string }).type ?? '',
    contactEmail: employer.contactEmail ?? '',
    contactPhone: employer.contactPhone ?? '',
    address: employer.address ?? '',
    postalCode: employer.postalCode ?? '',
    logoUrl: employer.logoUrl ?? '',
    country: employer.country ?? '',
    state: employer.state ?? '',
    city: employer.city ?? '',
    description: employer.description ?? '',
    mission: (employer as Employer & { mission?: string | null }).mission ?? '',
    vision: (employer as Employer & { vision?: string | null }).vision ?? '',
    cultureDescription: (employer as Employer & { cultureDescription?: string | null }).cultureDescription ?? '',
    benefits: (employer as Employer & { benefits?: string[] }).benefits ?? [],
  };
}

export function buildChangedOrganizationPayload(
  employer: Employer,
  form: EmployerEditForm
): EmployerUpdatePayload {
  const currentValues = makeEmployerEditForm(employer);

  return editableKeys.reduce<EmployerUpdatePayload>((payload, key) => {
    // Handle benefits array
    if (key === 'benefits') {
      const currentBenefits = Array.isArray(currentValues.benefits) ? currentValues.benefits : [];
      const formBenefits = Array.isArray(form.benefits) ? form.benefits : [];
      if (JSON.stringify(formBenefits) !== JSON.stringify(currentBenefits)) {
        payload[key] = formBenefits;
      }
      return payload;
    }

    // Handle foundedYear as number
    if (key === 'foundedYear') {
      const formValue = form[key] ? Number(form[key]) : undefined;
      const currentValue = currentValues[key] ? Number(currentValues[key]) : undefined;
      if (formValue !== currentValue) {
        payload[key] = formValue ?? null;
      }
      return payload;
    }

    // Handle string fields (benefits already handled above, foundedYear handled next)
    const formValue = (form[key] as string).trim();
    const currentValue = (currentValues[key] as string).trim();

    if (formValue !== currentValue) {
      payload[key] = formValue || null;
    }

    return payload;
  }, {});
}
