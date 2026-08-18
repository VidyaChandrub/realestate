import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeft, Building2, Globe, Mail, MapPin, Phone, Users } from 'lucide-react';
import { toast } from 'sonner';
import { sanitizeIndianMobileNumber, getIndianMobileNumberError } from '@/lib/mobileNumber';
import { employersApi } from '@/api/services';
import { SearchableSelect } from '@/components/SearchableSelect';
import { EventsList } from '@/features/events/components/EventsList';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthStore } from '@/store/authStore';
import { hasAdminRole } from '@/auth/roles';
import { JobsList } from '@/features/jobs/components/JobsList';
import type { Employer, User } from '@/types';
import {
  buildChangedOrganizationPayload,
  makeEmployerEditForm,
  type EmployerEditForm,
} from './organizationEditUtils';
import { useEmployerLocationSelects } from './useEmployerLocationSelects';

type EmployerTeamMember = {
  id: string;
  role?: string;
  status?: string;
  isActive?: boolean;
  employer?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  };
};

type EmployerJob = {
  id: string;
  title?: string;
  status?: string;
  locationName?: string;
  employmentTypeName?: string;
  createdAt?: string;
  publishedAt?: string;
};

type EmployerEvent = {
  id: string;
  title?: string;
  status?: string;
  mode?: string;
  startDate?: string;
  endDate?: string;
  bannerImage?: string | null;
};

const emptyEditForm: EmployerEditForm = {
  name: '',
  industry: '',
  website: '',
  foundedYear: '',
  companySize: '',
  type: '',
  contactEmail: '',
  contactPhone: '',
  address: '',
  postalCode: '',
  logoUrl: '',
  country: '',
  state: '',
  city: '',
  description: '',
  mission: '',
  vision: '',
  cultureDescription: '',
  benefits: [],
};

const textFields: { key: keyof EmployerEditForm; label: string; type?: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'industry', label: 'Industry' },
  { key: 'website', label: 'Website' },
  { key: 'foundedYear', label: 'Founded Year', type: 'number' },
  { key: 'contactEmail', label: 'Contact Email' },
  { key: 'contactPhone', label: 'Contact Phone' },
  { key: 'address', label: 'Address' },
  { key: 'postalCode', label: 'Postal Code' },
  { key: 'logoUrl', label: 'Logo URL' },
];

function getEmployerText(employer: Employer, key: 'mission' | 'vision' | 'cultureDescription') {
  return (employer as Employer & Partial<Record<typeof key, string | null>>)[key] ?? '';
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

function EmployerDetailsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-80" />
      <Skeleton className="h-10 w-96" />
      <Skeleton className="h-[420px] w-full rounded-xl" />
    </div>
  );
}

export default function EmployerDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const userRoles = useAuthStore((s) => s.user?.roles ?? []);
  const isAdmin = hasAdminRole(userRoles);
  const [editForm, setEditForm] = useState<EmployerEditForm>(emptyEditForm);
  const [benefitInput, setBenefitInput] = useState('');
  const [contactPhoneTouched, setContactPhoneTouched] = useState(false);

  const {
    data: employer,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['employer', id],
    queryFn: () => employersApi.getOne(id!),
    enabled: Boolean(id),
  });

  const locationSelects = useEmployerLocationSelects(employer, setEditForm);

  const {
    data: teamMembers = [],
    isLoading: teamLoading,
    isError: teamError,
    error: teamErrorObject,
  } = useQuery<EmployerTeamMember[]>({
    queryKey: ['employer-users', id],
    queryFn: () => employersApi.getUsers(id!),
    enabled: Boolean(id),
  });



  useEffect(() => {
    if (employer) {
      setEditForm(makeEmployerEditForm(employer));
      setBenefitInput('');
    }
  }, [employer]);

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

  const changedPayload = useMemo(
    () => (employer ? buildChangedOrganizationPayload(employer, editForm) : {}),
    [editForm, employer]
  );
  const hasChanges = Object.keys(changedPayload).length > 0;


  const contactPhoneValue = String(editForm.contactPhone || '').trim();
  const contactPhoneError = contactPhoneValue ? getIndianMobileNumberError(contactPhoneValue) : '';

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!id || !employer) {
        throw new Error('Employer details are not available.');
      }

      if (!editForm.name.trim()) {
        throw new Error('Name is required.');
      }

      const payload = buildChangedOrganizationPayload(employer, editForm);
      if (Object.keys(payload).length === 0) {
        throw new Error('No changes to save.');
      }

      return employersApi.update(id, payload);
    },
    onSuccess: async () => {
      toast.success('Agency details updated.');
      await queryClient.invalidateQueries({ queryKey: ['employer', id] });
      await queryClient.invalidateQueries({ queryKey: ['organization', id] });
      await queryClient.invalidateQueries({ queryKey: ['employers'] });
    },
    onError: (mutationError: unknown) => {
      const responseMessage = (mutationError as any)?.response?.data?.message;
      const message = typeof responseMessage === 'string'
        ? responseMessage
        : mutationError instanceof Error
        ? mutationError.message
        : 'Failed to update agency.';

      if (/mobile.*(already|taken|exists)|already.*mobile|taken.*mobile|exists.*mobile/i.test(message)) {
        toast.error('This mobile number is already taken');
        return;
      }

      toast.error(message);
    },
  });

  const handleSaveEmployer = () => {
    if (contactPhoneError) {
      setContactPhoneTouched(true);
      toast.error(contactPhoneError);
      return;
    }

    updateMutation.mutate();
  };

  if (isLoading) {
    return <EmployerDetailsSkeleton />;
  }

  if (!id || isError || !employer) {
    const message = error instanceof Error ? error.message : 'Unable to load agency details.';

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            {employer?.name ? `${employer.name} Details` : 'Agency Details'}
          </h2>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
        <Card>
          <CardContent className="flex items-center justify-between gap-4 p-6">
            <p className="text-sm text-muted-foreground">The requested agency could not be found.</p>
            <Button variant="outline" onClick={() => navigate('/employers')}>
              Back to Agencies
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const location = [employer.city, employer.state, employer.country].filter(Boolean).join(', ');

  return (
    <div className="space-y-6">
      <div className="flex gap-4 lg:flex-cols-1 items-start justify-start">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            className="w-fit flex items-center gap-2 px-0 text-sm text-muted-foreground hover:text-foreground"
            onClick={() => navigate('/employers')}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-foreground">
            {employer?.name ? `${employer.name} Details` : 'Agency Details'}
          </h2>
          <p className="text-sm text-muted-foreground">View and manage this agency organisation.</p>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="edit">Edit Details</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="jobs">Properties</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="danger">Danger Zone</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                {employer.logoUrl ? (
                  <img src={employer.logoUrl} alt={employer.name} className="h-16 w-16 rounded-lg border object-cover" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10">
                    <Building2 className="h-8 w-8 text-primary" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-bold">{employer.name}</h3>
                    <StatusBadge status={employer.isApproved ? 'active' : 'pending'} />
                    {employer.isSuspended && <StatusBadge status="suspended" />}
                  </div>
                  {employer.industry && <p className="text-sm text-muted-foreground">{employer.industry}</p>}
                  {employer.description && <p className="mt-2 text-sm">{employer.description}</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <DetailItem icon={Globe} label="Website" value={employer.website} />
            <DetailItem icon={Mail} label="Contact Email" value={employer.contactEmail} />
            <DetailItem icon={Phone} label="Contact Phone" value={employer.contactPhone} />
            <DetailItem icon={MapPin} label="Location" value={location} />
            <DetailItem icon={MapPin} label="Address" value={employer.address} />
            <DetailItem icon={Building2} label="Founded Year" value={(employer as Employer & { foundedYear?: number }).foundedYear?.toString()} />
            <DetailItem icon={Users} label="Company Size" value={(employer as Employer & { companySize?: string }).companySize?.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())} />
            <DetailItem icon={Building2} label="Type" value={(employer as Employer & { type?: string }).type} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Mission</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{getEmployerText(employer, 'mission') || 'Not provided'}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Vision</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{getEmployerText(employer, 'vision') || 'Not provided'}</p>
              </CardContent>
            </Card>
          </div>

          {getEmployerText(employer, 'cultureDescription') && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Culture Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{getEmployerText(employer, 'cultureDescription')}</p>
              </CardContent>
            </Card>
          )}

          {(employer as Employer & { benefits?: string[] }).benefits && (employer as Employer & { benefits?: string[] }).benefits!.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Benefits</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {(employer as Employer & { benefits?: string[] }).benefits!.map((benefit, index) => (
                    <span key={index} className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-sm">
                      {benefit}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="edit" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Edit Agency</CardTitle>
              <CardDescription>Update organisation details for this agency.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {textFields.map(({ key, label, type }) => {
                  if (key === 'contactPhone') {
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
                            value={contactPhoneValue}
                            onChange={(event) => setEditForm((form) => ({
                              ...form,
                              contactPhone: sanitizeIndianMobileNumber(event.target.value),
                            }))}
                            onBlur={() => setContactPhoneTouched(true)}
                            maxLength={10}
                            className="flex-1"
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
                        type={type || 'text'}
                        value={editForm[key]}
                        onChange={(event) => setEditForm((form) => ({ ...form, [key]: event.target.value }))}
                      />
                    </div>
                  );
                })}
                <SearchableSelect
                  label="Country"
                  value={locationSelects.selectedCountryId}
                  options={locationSelects.countryOptions.map((country) => ({ id: country.id, value: country.value }))}
                  placeholder="Select country"
                  isLoading={locationSelects.countriesLoading}
                  onSearch={locationSelects.onCountrySearch}
                  onChange={locationSelects.onCountryChange}
                />
                <SearchableSelect
                  label="State"
                  value={locationSelects.selectedStateId}
                  options={locationSelects.stateOptions.map((state) => ({ id: state.id, value: state.value }))}
                  placeholder={locationSelects.selectedCountryId ? 'Select state' : 'Select country first'}
                  disabled={!locationSelects.selectedCountryId}
                  isLoading={locationSelects.statesLoading}
                  onSearch={locationSelects.onStateSearch}
                  onChange={locationSelects.onStateChange}
                />
                <SearchableSelect
                  label="City"
                  value={locationSelects.selectedCityId}
                  options={locationSelects.cityOptions.map((city) => ({ id: city.id, value: city.value }))}
                  placeholder={locationSelects.selectedStateId ? 'Select city' : 'Select state first'}
                  disabled={!locationSelects.selectedStateId}
                  isLoading={locationSelects.citiesLoading}
                  onSearch={locationSelects.onCitySearch}
                  onChange={locationSelects.onCityChange}
                />
                <div className="space-y-2">
                  <Label>Company Size</Label>
                  <Select 
                    value={editForm.companySize} 
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
                    value={editForm.type} 
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
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={editForm.description}
                  onChange={(event) => setEditForm((form) => ({ ...form, description: event.target.value }))}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Mission</Label>
                <Textarea
                  value={editForm.mission}
                  onChange={(event) => setEditForm((form) => ({ ...form, mission: event.target.value }))}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Vision</Label>
                <Textarea
                  value={editForm.vision}
                  onChange={(event) => setEditForm((form) => ({ ...form, vision: event.target.value }))}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Culture Description</Label>
                <Textarea
                  value={editForm.cultureDescription}
                  onChange={(event) => setEditForm((form) => ({ ...form, cultureDescription: event.target.value }))}
                  rows={2}
                />
              </div>
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
              <Button onClick={handleSaveEmployer} disabled={updateMutation.isPending || !hasChanges}>
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Members
              </CardTitle>
              <CardDescription>Review users associated with this agency organisation.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {teamLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((index) => (
                    <div key={index} className="grid gap-3 sm:grid-cols-[1.8fr_1fr_0.8fr_0.6fr] items-center rounded-xl border border-border bg-background p-4">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-36" />
                        <Skeleton className="h-4 w-56" />
                      </div>
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-7 w-20 rounded-full" />
                    </div>
                  ))}
                </div>
              ) : teamError ? (
                <p className="text-sm text-muted-foreground">
                  {teamErrorObject instanceof Error
                    ? teamErrorObject.message
                    : 'Unable to load team members. Please try again.'}
                </p>
              ) : teamMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No team members found for this organisation.</p>
              ) : (
                <div className="space-y-3">
                  {teamMembers.map((user) => {
                    const fullName = [user.employer?.firstName, user.employer?.lastName]
                      .filter(Boolean)
                      .join(' ')
                      .trim();

                    return (
                      <div
                        key={user.id}
                        className="grid gap-3 rounded-xl border border-border bg-background p-4 sm:grid-cols-[1.8fr_1fr_0.8fr_0.6fr]"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-foreground">
                            {fullName || user.employer?.email || 'Unknown User'}
                          </p>
                          <p className="text-sm text-muted-foreground break-words">
                            {user.employer?.email || 'No email provided'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Role</p>
                          <p className="font-medium">{user.role ?? 'Unknown'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Status</p>
                          <p className="font-medium">{user.isActive ? 'Active' : 'Inactive'}</p>
                        </div>
                        <div className="flex items-center justify-end">
                          <StatusBadge status={user.isActive ? 'active' : 'inactive'} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="jobs" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Properties</CardTitle>
              <CardDescription>Properties associated with this organisation.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <JobsList employerId={id} hideHeader />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Events</CardTitle>
              <CardDescription>
                Events associated with this organisation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <EventsList employerId={id} hideHeader={true} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="danger" className="mt-4">
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Danger Zone
              </CardTitle>
              <CardDescription>Destructive agency actions will be available here when backend support is added.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              No danger zone actions are enabled for this admin view yet.
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
