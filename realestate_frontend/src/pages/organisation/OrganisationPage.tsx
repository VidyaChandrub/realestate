import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Building2,
  Globe,
  Mail,
  MapPin,
  Phone,
  Plus,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { employersApi, eventsApi } from '@/api/services';
import { sanitizeIndianMobileNumber, getIndianMobileNumberError } from '@/lib/mobileNumber';
import { hasAdminRole } from '@/auth/roles';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { OrganizationCreateForm, type OrganizationCreateFormValues } from '@/components/OrganizationCreateForm';
import { OrganizationLogoUpload } from '@/components/OrganizationLogoUpload';
import { SearchableSelect } from '@/components/SearchableSelect';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useAuthStore } from '@/store/authStore';
import type { Employer, MasterDataItem } from '@/types';

type LocationSearchTerms = {
  country: string;
  state: string;
  city: string;
};

const emptyLocationSearchTerms: LocationSearchTerms = {
  country: '',
  state: '',
  city: '',
};

const normalizeLocationValue = (value?: string | null) => (value ?? '').trim().toLowerCase();

const findMasterDataByValue = (items: MasterDataItem[], value?: string | null) => {
  const normalizedValue = normalizeLocationValue(value);
  if (!normalizedValue) return undefined;

  return items.find((item) => normalizeLocationValue(item.value) === normalizedValue);
};

const uniqueMasterDataItems = (items: MasterDataItem[]) => {
  const seen = new Set<string>();

  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
};

const withSelectedMasterDataItem = (items: MasterDataItem[], selectedItem?: MasterDataItem | null) => (
  selectedItem ? uniqueMasterDataItems([selectedItem, ...items]) : items
);

function useDebouncedLocationSearchTerms(searchTerms: LocationSearchTerms) {
  const [debouncedSearchTerms, setDebouncedSearchTerms] = useState(emptyLocationSearchTerms);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearchTerms(searchTerms);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [searchTerms]);

  return debouncedSearchTerms;
}

const buildOrganizationPayload = (values: OrganizationCreateFormValues) => ({
  name: values.name.trim(),
  description: values.description.trim() || undefined,
  industry: values.industry.trim() || undefined,
  website: values.website.trim() || undefined,
  foundedYear: values.foundedYear ? Number(values.foundedYear) : undefined,
  companySize: values.companySize || undefined,
  type: values.type || undefined,
  contactEmail: values.contactEmail.trim() || undefined,
  contactPhone: values.contactPhone.trim() || undefined,
  country: values.country.trim() || undefined,
  state: values.state.trim() || undefined,
  city: values.city.trim() || undefined,
  address: values.address.trim() || undefined,
  postalCode: values.postalCode.trim() || undefined,
  mission: values.mission.trim() || undefined,
  vision: values.vision.trim() || undefined,
  cultureDescription: values.cultureDescription.trim() || undefined,
  benefits: values.benefits,
  logoUrl: values.logoUrl.trim() || undefined,
});

function makeEditForm(org: Employer) {
  return {
    name: org.name ?? '',
    description: org.description ?? '',
    industry: org.industry ?? '',
    website: org.website ?? '',
    foundedYear: (org as any).foundedYear ? String((org as any).foundedYear) : '',
    companySize: (org as any).companySize ?? '',
    type: (org as any).type ?? '',
    contactEmail: org.contactEmail ?? '',
    contactPhone: org.contactPhone ?? '',
    country: org.country ?? '',
    state: org.state ?? '',
    city: org.city ?? '',
    address: org.address ?? '',
    postalCode: org.postalCode ?? '',
    mission: (org as any).mission ?? '',
    vision: (org as any).vision ?? '',
    cultureDescription: (org as any).cultureDescription ?? '',
    benefits: (org as any).benefits ?? [],
    logoUrl: org.logoUrl ?? '',
  };
}

function buildChangedOrganizationPayload(org: Employer, form: Record<string, string | string[]>) {
  const currentValues = makeEditForm(org);

  return Object.entries(form).reduce<Record<string, any>>((payload, [key, value]) => {
    const currentValue = currentValues[key as keyof typeof currentValues];
    
    // Handle benefits array
    if (key === 'benefits' && Array.isArray(value)) {
      const currentBenefits = Array.isArray(currentValue) ? currentValue : [];
      if (JSON.stringify(value) !== JSON.stringify(currentBenefits)) {
        payload[key] = value;
      }
      return payload;
    }
    
    // Handle numeric and enum fields
    if (key === 'foundedYear') {
      const nextValue = value ? Number(value) : undefined;
      const currentNum = typeof currentValue === 'string' ? Number(currentValue) : currentValue;
      if (nextValue && nextValue !== currentNum) {
        payload[key] = nextValue;
      }
      return payload;
    }

    // Logo can be explicitly cleared, so it must be compared (and sent) even when empty.
    if (key === 'logoUrl') {
      const nextValue = typeof value === 'string' ? value.trim() : '';
      const currentStr = typeof currentValue === 'string' ? currentValue.trim() : '';
      if (nextValue !== currentStr) {
        payload[key] = nextValue || null;
      }
      return payload;
    }

    // Handle string fields
    const nextValue = typeof value === 'string' ? value.trim() : '';
    const currentStr = typeof currentValue === 'string' ? currentValue.trim() : '';

    if (nextValue && nextValue !== currentStr) {
      payload[key] = nextValue;
    }

    return payload;
  }, {});
}

function getOrganizationText(org: Employer, key: 'mission' | 'vision' | 'cultureDescription') {
  return (org as Employer & Partial<Record<typeof key, string | null>>)[key] ?? '';
}

function formatCompanySize(value?: string | null) {
  return value
    ? value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase())
    : '';
}

function formatLocation(org: Employer) {
  return [org.city, org.state, org.country].filter(Boolean).join(', ');
}

function DetailItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Globe;
  label: string;
  value?: string | null;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="truncate text-sm">{value?.trim() || 'Not provided'}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function OrganisationPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const userRoles = useAuthStore((state) => state.user?.roles ?? []);
  const isAdmin = hasAdminRole(userRoles);
  const [editForm, setEditForm] = useState<Record<string, string | string[]>>({});
  const [benefitInput, setBenefitInput] = useState('');
  const [contactPhoneTouched, setContactPhoneTouched] = useState(false);
  const [selectedCountryId, setSelectedCountryId] = useState('');
  const [selectedStateId, setSelectedStateId] = useState('');
  const [selectedCityId, setSelectedCityId] = useState('');
  const [selectedCountryItem, setSelectedCountryItem] = useState<MasterDataItem | null>(null);
  const [selectedStateItem, setSelectedStateItem] = useState<MasterDataItem | null>(null);
  const [selectedCityItem, setSelectedCityItem] = useState<MasterDataItem | null>(null);
  const [locationSearchTerms, setLocationSearchTerms] = useState(emptyLocationSearchTerms);
  const debouncedLocationSearchTerms = useDebouncedLocationSearchTerms(locationSearchTerms);
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [teamForm, setTeamForm] = useState({
    userEmail: '',
    role: 'RECRUITER',
    status: 'INVITED',
    permissions: [] as string[],
  });

  const { data: meData, isLoading: meLoading } = useQuery({
    queryKey: ['me-org'],
    queryFn: employersApi.getMe,
    enabled: !!useAuthStore((s) => s.token),
  });

  const selectedOrganizationId = meData?.defaultOrganizationId;

  const { data: organization, isLoading: organizationLoading } = useQuery({
    queryKey: ['organization', selectedOrganizationId],
    queryFn: () => employersApi.getOne(selectedOrganizationId!),
    enabled: !!selectedOrganizationId,
  });

  const { data: countries = [], isLoading: countriesLoading } = useQuery({
    queryKey: ['organisation-edit-countries'],
    queryFn: eventsApi.getCountries,
    staleTime: 5 * 60 * 1000,
  });

  const selectedCountry = useMemo(
    () => selectedCountryItem ?? countries.find((country) => country.id === selectedCountryId),
    [countries, selectedCountryId, selectedCountryItem]
  );

  const { data: states = [], isLoading: statesLoading } = useQuery({
    queryKey: ['organisation-edit-states', selectedCountry?.slug],
    queryFn: () => eventsApi.getStatesByCountrySlug(selectedCountry!.slug),
    enabled: Boolean(selectedCountry?.slug),
    staleTime: 5 * 60 * 1000,
    keepPreviousData: true,
  });

  const selectedState = useMemo(
    () => selectedStateItem ?? states.find((state) => state.id === selectedStateId),
    [selectedStateId, selectedStateItem, states]
  );

  const { data: cities = [], isLoading: citiesLoading } = useQuery({
    queryKey: ['organisation-edit-cities', selectedState?.slug],
    queryFn: () => eventsApi.getCitiesByStateSlug(selectedState!.slug),
    enabled: Boolean(selectedState?.slug),
    staleTime: 5 * 60 * 1000,
    keepPreviousData: true,
  });

  const selectedCity = useMemo(
    () => selectedCityItem ?? cities.find((city) => city.id === selectedCityId),
    [cities, selectedCityId, selectedCityItem]
  );

  const { data: searchedCountries = [] } = useQuery({
    queryKey: ['organisation-edit-search-countries', debouncedLocationSearchTerms.country],
    queryFn: () => eventsApi.searchMasterData(debouncedLocationSearchTerms.country, 'LOCATION_COUNTRY'),
    enabled: debouncedLocationSearchTerms.country.length >= 3,
    staleTime: 2 * 60 * 1000,
  });

  const { data: searchedStates = [] } = useQuery({
    queryKey: ['organisation-edit-search-states', selectedCountryId, debouncedLocationSearchTerms.state],
    queryFn: () => eventsApi.searchMasterData(debouncedLocationSearchTerms.state, 'LOCATION_STATE'),
    enabled: Boolean(selectedCountryId) && debouncedLocationSearchTerms.state.length >= 3,
    staleTime: 2 * 60 * 1000,
  });

  const { data: searchedCities = [] } = useQuery({
    queryKey: ['organisation-edit-search-cities', selectedStateId, debouncedLocationSearchTerms.city],
    queryFn: () => eventsApi.searchMasterData(debouncedLocationSearchTerms.city, 'LOCATION_CITY'),
    enabled: Boolean(selectedStateId) && debouncedLocationSearchTerms.city.length >= 3,
    staleTime: 2 * 60 * 1000,
  });

  const countryOptions = useMemo(
    () => withSelectedMasterDataItem(
      debouncedLocationSearchTerms.country.length >= 3 ? searchedCountries : countries,
      selectedCountry
    ),
    [countries, debouncedLocationSearchTerms.country, searchedCountries, selectedCountry]
  );

  const stateOptions = useMemo(() => {
    const baseStates = debouncedLocationSearchTerms.state.length >= 3
      ? searchedStates.filter((state) => !state.parentId || state.parentId === selectedCountryId)
      : states;

    return withSelectedMasterDataItem(baseStates, selectedState);
  }, [debouncedLocationSearchTerms.state, searchedStates, selectedCountryId, selectedState, states]);

  const cityOptions = useMemo(() => {
    const baseCities = debouncedLocationSearchTerms.city.length >= 3
      ? searchedCities.filter((city) => !city.parentId || city.parentId === selectedStateId)
      : cities;

    return withSelectedMasterDataItem(baseCities, selectedCity);
  }, [cities, debouncedLocationSearchTerms.city, searchedCities, selectedCity, selectedStateId]);

  const addBenefit = (event?: React.MouseEvent<HTMLButtonElement>) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const nextBenefit = benefitInput.trim();
    const currentBenefits = Array.isArray(editForm.benefits) ? editForm.benefits : [];
    if (!nextBenefit || currentBenefits.includes(nextBenefit)) return;
    setEditForm((current) => ({ ...current, benefits: [...currentBenefits, nextBenefit] }));
    setBenefitInput('');
  };

  useEffect(() => {
    if (organization) {
      setEditForm(makeEditForm(organization));
      setBenefitInput('');
      setSelectedCountryId('');
      setSelectedStateId('');
      setSelectedCityId('');
      setSelectedCountryItem(null);
      setSelectedStateItem(null);
      setSelectedCityItem(null);
      setLocationSearchTerms(emptyLocationSearchTerms);
    }
  }, [organization]);

  useEffect(() => {
    if (!organization || selectedCountryId || !organization.country) return;

    const country = findMasterDataByValue(countries, organization.country);
    if (country) {
      setSelectedCountryId(country.id);
      setSelectedCountryItem(country);
    }
  }, [countries, organization, selectedCountryId]);

  useEffect(() => {
    if (!organization || selectedStateId || !selectedCountryId || !organization.state) return;

    const state = findMasterDataByValue(states, organization.state);
    if (state) {
      setSelectedStateId(state.id);
      setSelectedStateItem(state);
    }
  }, [organization, selectedCountryId, selectedStateId, states]);

  useEffect(() => {
    if (!organization || selectedCityId || !selectedStateId || !organization.city) return;

    const city = findMasterDataByValue(cities, organization.city);
    if (city) {
      setSelectedCityId(city.id);
      setSelectedCityItem(city);
    }
  }, [cities, organization, selectedCityId, selectedStateId]);

  const selectedOrganization = organization;
  const isOwner = !isAdmin && (((selectedOrganization as any)?.role ?? 'OWNER') === 'OWNER');
  const canManageOrganisation = isAdmin || isOwner;
  const members = useMemo(
    () => ((selectedOrganization as any)?.users ?? (selectedOrganization as any)?.members ?? []),
    [selectedOrganization]
  );

  const createMutation = useMutation({
    mutationFn: (values: OrganizationCreateFormValues) => employersApi.create(buildOrganizationPayload(values)),
    onSuccess: async (createdOrganization) => {
      toast.success('Organization created successfully.');
      await queryClient.invalidateQueries({ queryKey: ['me-org'] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Failed to create organization.';
      toast.error(message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!selectedOrganization) {
        throw new Error('Select an organisation before saving.');
      }

      const payload = buildChangedOrganizationPayload(selectedOrganization, editForm);
      if (Object.keys(payload).length === 0) {
        throw new Error('No changes to save.');
      }

      return employersApi.update(selectedOrganizationId!, payload);
    },
    onSuccess: async () => {
      toast.success('Organisation updated.');
      await queryClient.invalidateQueries({ queryKey: ['organization', selectedOrganizationId] });
      await queryClient.invalidateQueries({ queryKey: ['me-org'] });
    },
    onError: (error: unknown) => {
      const responseMessage = (error as any)?.response?.data?.message;
      const message = typeof responseMessage === 'string'
        ? responseMessage
        : error instanceof Error
        ? error.message
        : 'Failed to update organisation.';

      if (/mobile.*(already|taken|exists)|already.*mobile|taken.*mobile|exists.*mobile/i.test(message)) {
        toast.error('This mobile number is already taken');
        return;
      }

      toast.error(message);
    },
  });

  const handleSaveOrganization = () => {
    const phone = String(editForm.contactPhone || '').trim();
    if (phone) {
      const mobileError = getIndianMobileNumberError(phone);
      if (mobileError) {
        setContactPhoneTouched(true);
        toast.error(mobileError);
        return;
      }
    }

    updateMutation.mutate();
  };

  const addTeamMemberMutation = useMutation({
    mutationFn: () => employersApi.addTeamMember(selectedOrganizationId!, { ...teamForm, isActive: true }),
    onSuccess: async () => {
      toast.success('Team member added.');
      setTeamDialogOpen(false);
      setTeamForm({ userEmail: '', role: 'RECRUITER', status: 'INVITED', permissions: [] });
      await queryClient.invalidateQueries({ queryKey: ['organization', selectedOrganizationId] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to add team member.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => employersApi.delete(selectedOrganizationId!),
    onSuccess: async () => {
      toast.success('Organisation deleted.');
      setDeleteDialogOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['me-org'] });
      navigate('/onboarding/organisation');
    },
    onError: () => toast.error('Failed to delete organisation.'),
  });

  if (meLoading || organizationLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
        <Skeleton className="h-[420px] w-full rounded-xl" />
      </div>
    );
  }

  if (!selectedOrganization) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Organisation</h2>
          <p className="text-sm text-muted-foreground">Create an organisation to start hiring.</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Create Organisation</CardTitle>
            <CardDescription>Add your organisation profile and hiring details.</CardDescription>
          </CardHeader>
          <CardContent>
            <OrganizationCreateForm
              isSubmitting={createMutation.isPending}
              onCancel={() => navigate('/dashboard')}
              onSubmit={(values) => createMutation.mutateAsync(values)}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Organisation</h2>
          <p className="text-sm text-muted-foreground">Manage your organisation settings.</p>
        </div>
      </div>

      <Tabs defaultValue={location.pathname.endsWith('/team') ? 'team' : 'overview'}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {canManageOrganisation && <TabsTrigger value="edit">Edit Details</TabsTrigger>}
          <TabsTrigger value="team">Team</TabsTrigger>
          {canManageOrganisation && <TabsTrigger value="danger">Danger Zone</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                {selectedOrganization.logoUrl ? (
                  <img src={selectedOrganization.logoUrl} alt={selectedOrganization.name} className="h-16 w-16 rounded-lg border object-cover" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10">
                    <Building2 className="h-8 w-8 text-primary" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-bold">{selectedOrganization.name}</h3>
                    <StatusBadge status={(selectedOrganization as any).isApproved ? 'active' : 'pending'} />
                    {(selectedOrganization as any).isSuspended && <StatusBadge status="suspended" />}
                  </div>
                  {selectedOrganization.industry && <p className="text-sm text-muted-foreground">{selectedOrganization.industry}</p>}
                  {selectedOrganization.description && <p className="mt-2 text-sm">{selectedOrganization.description}</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <DetailItem icon={Globe} label="Website" value={selectedOrganization.website} />
            <DetailItem icon={Mail} label="Contact Email" value={selectedOrganization.contactEmail} />
            <DetailItem icon={Phone} label="Contact Phone" value={selectedOrganization.contactPhone} />
            <DetailItem icon={MapPin} label="Location" value={formatLocation(selectedOrganization)} />
            <DetailItem icon={MapPin} label="Address" value={selectedOrganization.address} />
            <DetailItem icon={Building2} label="Founded Year" value={(selectedOrganization as Employer & { foundedYear?: number }).foundedYear?.toString()} />
            <DetailItem icon={Users} label="Company Size" value={formatCompanySize((selectedOrganization as Employer & { companySize?: string }).companySize)} />
            <DetailItem icon={Building2} label="Type" value={(selectedOrganization as Employer & { type?: string }).type} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Mission</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{getOrganizationText(selectedOrganization, 'mission') || 'Not provided'}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Vision</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{getOrganizationText(selectedOrganization, 'vision') || 'Not provided'}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Culture Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{getOrganizationText(selectedOrganization, 'cultureDescription') || 'Not provided'}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Benefits</CardTitle>
            </CardHeader>
            <CardContent>
              {Array.isArray((selectedOrganization as Employer & { benefits?: string[] }).benefits) && (selectedOrganization as Employer & { benefits?: string[] }).benefits!.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {(selectedOrganization as Employer & { benefits?: string[] }).benefits!.map((benefit, index) => (
                    <span key={index} className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-sm">
                      {benefit}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Not provided</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {canManageOrganisation && (
          <TabsContent value="edit" className="mt-4">
            <Card>
              <CardHeader><CardTitle>Edit Organisation</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <OrganizationLogoUpload
                  value={typeof editForm.logoUrl === 'string' ? editForm.logoUrl : ''}
                  onChange={(url) => setEditForm((form) => ({ ...form, logoUrl: url ?? '' }))}
                />
                <div className="grid gap-4 md:grid-cols-2">
                  {[
                    ['name', 'Name'],
                    ['industry', 'Industry'],
                    ['website', 'Website'],
                    ['foundedYear', 'Founded Year'],
                    ['contactEmail', 'Contact Email'],
                    ['contactPhone', 'Contact Phone'],
                    ['address', 'Address'],
                    ['postalCode', 'Postal Code'],
                  ].map(([key, label]) => {
                    if (key === 'contactPhone') {
                      const contactPhoneValue = String(editForm.contactPhone || '').trim();
                      const contactPhoneError = contactPhoneValue ? getIndianMobileNumberError(contactPhoneValue) : '';

                      return (
                        <div key={key} className="space-y-2">
                          <Label>{label}</Label>
                          <div className="flex items-center gap-2">
                            <span className="inline-flex h-11 items-center rounded-2xl border border-[#CDD0E8] bg-[#E3E4F5] px-4 text-sm font-medium text-[#1D35C0]">
                              +91
                            </span>
                            <Input
                              type="tel"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              placeholder="Enter mobile number"
                              value={editForm.contactPhone || ''}
                              onChange={(event) => setEditForm((form) => ({
                                ...form,
                                contactPhone: sanitizeIndianMobileNumber(event.target.value),
                              }))}
                              onBlur={() => setContactPhoneTouched(true)}
                              maxLength={10}
                            />
                          </div>
                          {contactPhoneTouched && contactPhoneError ? (
                            <p className="text-sm text-red-500">{contactPhoneError}</p>
                          ) : null}
                        </div>
                      );
                    }

                    return (
                      <div key={key} className="space-y-2">
                        <Label>{label}</Label>
                        <Input 
                          type={key === 'foundedYear' ? 'number' : 'text'}
                          value={editForm[key] || ''} 
                          onChange={(event) => setEditForm((form) => ({ ...form, [key]: event.target.value }))} 
                        />
                      </div>
                    );
                  })}
                  <div className="space-y-2">
                    <Label>Company Size</Label>
                    <Select 
                      value={String(editForm.companySize || '')} 
                      onValueChange={(value) => setEditForm((form) => ({ ...form, companySize: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ONE_TO_TEN">1-10</SelectItem>
                        <SelectItem value="ELEVEN_TO_FIFTY">11-50</SelectItem>
                        <SelectItem value="FIFTY_ONE_TO_TWO_HUNDRED">51-200</SelectItem>
                        <SelectItem value="TWO_HUNDRED_ONE_TO_FIVE_HUNDRED">201-500</SelectItem>
                        <SelectItem value="FIVE_HUNDRED_PLUS">500+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select 
                      value={String(editForm.type || '')} 
                      onValueChange={(value) => setEditForm((form) => ({ ...form, type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PRIVATE">PRIVATE</SelectItem>
                        <SelectItem value="PUBLIC">PUBLIC</SelectItem>
                        <SelectItem value="STARTUP">STARTUP</SelectItem>
                        <SelectItem value="NGO">NGO</SelectItem>
                        <SelectItem value="GOVERNMENT">GOVERNMENT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <SearchableSelect
                    label="Country"
                    value={selectedCountryId}
                    options={countryOptions.map((country) => ({ id: country.id, value: country.value }))}
                    placeholder="Select country"
                    isLoading={countriesLoading}
                    onSearch={(value) => setLocationSearchTerms((terms) => ({ ...terms, country: value }))}
                    onChange={(countryId) => {
                      const country = countryOptions.find((item) => item.id === countryId);

                      setSelectedCountryId(countryId);
                      setSelectedCountryItem(country ?? null);
                      setSelectedStateId('');
                      setSelectedCityId('');
                      setSelectedStateItem(null);
                      setSelectedCityItem(null);
                      setLocationSearchTerms((terms) => ({ ...terms, state: '', city: '' }));
                      setEditForm((form) => ({
                        ...form,
                        country: country?.value ?? '',
                        state: '',
                        city: '',
                      }));
                    }}
                  />
                  <SearchableSelect
                    label="State"
                    value={selectedStateId}
                    options={stateOptions.map((state) => ({ id: state.id, value: state.value }))}
                    placeholder={selectedCountryId ? 'Select state' : 'Select country first'}
                    disabled={!selectedCountryId}
                    isLoading={statesLoading}
                    onSearch={(value) => setLocationSearchTerms((terms) => ({ ...terms, state: value }))}
                    onChange={(stateId) => {
                      const state = stateOptions.find((item) => item.id === stateId);

                      setSelectedStateId(stateId);
                      setSelectedStateItem(state ?? null);
                      setSelectedCityId('');
                      setSelectedCityItem(null);
                      setLocationSearchTerms((terms) => ({ ...terms, city: '' }));
                      setEditForm((form) => ({
                        ...form,
                        state: state?.value ?? '',
                        city: '',
                      }));
                    }}
                  />
                  <SearchableSelect
                    label="City"
                    value={selectedCityId}
                    options={cityOptions.map((city) => ({ id: city.id, value: city.value }))}
                    placeholder={selectedStateId ? 'Select city' : 'Select state first'}
                    disabled={!selectedStateId}
                    isLoading={citiesLoading}
                    onSearch={(value) => setLocationSearchTerms((terms) => ({ ...terms, city: value }))}
                    onChange={(cityId) => {
                      const city = cityOptions.find((item) => item.id === cityId);

                      setSelectedCityId(cityId);
                      setSelectedCityItem(city ?? null);
                      setEditForm((form) => ({
                        ...form,
                        city: city?.value ?? '',
                      }));
                    }}
                  />
                </div>
                <div className="space-y-2"><Label>Description</Label><Textarea value={editForm.description || ''} onChange={(event) => setEditForm((form) => ({ ...form, description: event.target.value }))} rows={3} /></div>
                <div className="space-y-2"><Label>Mission</Label><Textarea value={editForm.mission || ''} onChange={(event) => setEditForm((form) => ({ ...form, mission: event.target.value }))} rows={2} /></div>
                <div className="space-y-2"><Label>Vision</Label><Textarea value={editForm.vision || ''} onChange={(event) => setEditForm((form) => ({ ...form, vision: event.target.value }))} rows={2} /></div>
                <div className="space-y-2"><Label>Culture Description</Label><Textarea value={editForm.cultureDescription || ''} onChange={(event) => setEditForm((form) => ({ ...form, cultureDescription: event.target.value }))} rows={2} /></div>
                <div className="space-y-2">
                  <Label>Benefits</Label>
                  <div className="flex gap-2">
                    <Input
                      value={benefitInput}
                      onChange={(event) => setBenefitInput(event.target.value)}
                      placeholder="Add a benefit"
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          addBenefit();
                        }
                      }}
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={(e) => addBenefit(e)}
                      disabled={!benefitInput.trim() || (Array.isArray(editForm.benefits) ? editForm.benefits : []).includes(benefitInput.trim())}
                    >
                      Add
                    </Button>
                  </div>
                  {benefitInput.trim() && (Array.isArray(editForm.benefits) ? editForm.benefits : []).includes(benefitInput.trim()) && (
                    <p className="text-xs text-amber-600">This benefit is already added</p>
                  )}
                  {Array.isArray(editForm.benefits) && editForm.benefits.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {editForm.benefits.map((benefit, index) => (
                        <span key={index} className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-sm">
                          {benefit}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setEditForm((current) => ({
                                ...current,
                                benefits: (Array.isArray(current.benefits) ? current.benefits : []).filter((_, itemIndex) => itemIndex !== index),
                              }));
                            }}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            &times;
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  onClick={handleSaveOrganization}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="team" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Team Members</h3>
            {canManageOrganisation && (
              <Dialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen}>
                <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" />Add User</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Team Member</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Email or User ID</Label>
                      <Input value={teamForm.userEmail} onChange={(event) => setTeamForm((form) => ({ ...form, userEmail: event.target.value }))} placeholder="user@example.com or user ID" />
                    </div>
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Select value={teamForm.role} onValueChange={(value) => setTeamForm((form) => ({ ...form, role: value }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="HR">HR</SelectItem>
                          <SelectItem value="RECRUITER">Agent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Permissions</Label>
                      <div className="space-y-2">
                        {['VIEW_APPLICATIONS', 'POST_JOBS', 'MANAGE_TEAM'].map((permission) => (
                          <div key={permission} className="flex items-center gap-2">
                            <Checkbox
                              checked={teamForm.permissions.includes(permission)}
                              onCheckedChange={(checked) => {
                                setTeamForm((form) => ({
                                  ...form,
                                  permissions: checked
                                    ? [...form.permissions, permission]
                                    : form.permissions.filter((item) => item !== permission),
                                }));
                              }}
                            />
                            <label className="text-sm">{permission.replace(/_/g, ' ')}</label>
                          </div>
                        ))}
                      </div>
                    </div>
                    <Button className="w-full" onClick={() => addTeamMemberMutation.mutate()} disabled={addTeamMemberMutation.isPending || !teamForm.userEmail.trim()}>
                      {addTeamMemberMutation.isPending ? 'Adding...' : 'Add Member'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {members.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No team members found</CardContent></Card>
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name / Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member: any) => (
                    <TableRow key={member.id || member.userId || member.email}>
                      <TableCell>
                        <p className="text-sm font-medium">{member.fullName || member.user?.fullName || 'User'}</p>
                        <p className="text-xs text-muted-foreground">{member.email || member.user?.email || member.userId}</p>
                      </TableCell>
                      <TableCell><StatusBadge status={member.role || 'MEMBER'} /></TableCell>
                      <TableCell><StatusBadge status={member.status || 'ACTIVE'} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {canManageOrganisation && (
          <TabsContent value="danger" className="mt-4">
            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive"><AlertTriangle className="h-5 w-5" />Danger Zone</CardTitle>
                <CardDescription>Irreversible actions for your organisation.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
                  Delete Organisation
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Organisation"
        description="This will permanently delete your organisation, jobs, and associated data. This cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setDeleteDialogOpen(false)}
      />
    </div>
  );
}
