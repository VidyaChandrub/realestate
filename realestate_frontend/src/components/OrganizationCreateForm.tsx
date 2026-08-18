import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/api/client';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OrganizationLogoUpload } from '@/components/OrganizationLogoUpload';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { getIndianMobileNumberError, sanitizeIndianMobileNumber } from '@/lib/mobileNumber';

export interface OrganizationCreateFormValues {
  name: string;
  description: string;
  industry: string;
  website: string;
  foundedYear: string;
  companySize: string;
  type: string;
  contactEmail: string;
  contactPhone: string;
  country: string;
  state: string;
  city: string;
  address: string;
  postalCode: string;
  mission: string;
  vision: string;
  cultureDescription: string;
  benefits: string[];
  logoUrl: string;
}

interface OrganizationCreateFormProps {
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (values: OrganizationCreateFormValues) => Promise<void> | void;
}

const COMPANY_SIZES = [
  { label: '1-10', value: 'ONE_TO_TEN' },
  { label: '11-50', value: 'ELEVEN_TO_FIFTY' },
  { label: '51-200', value: 'FIFTY_ONE_TO_TWO_HUNDRED' },
  { label: '201-500', value: 'TWO_HUNDRED_ONE_TO_FIVE_HUNDRED' },
  { label: '500+', value: 'FIVE_HUNDRED_PLUS' },
];

const ORGANIZATION_TYPES = ['PRIVATE', 'PUBLIC', 'STARTUP', 'NGO', 'GOVERNMENT'];

interface MasterDataOption {
  id: string;
  value: string;
}

interface LocationSearchSelectProps {
  value: string;
  options: MasterDataOption[];
  placeholder: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onSelect: (option: MasterDataOption) => void;
  disabled?: boolean;
  isLoading?: boolean;
}

const getMasterDataItems = (payload: unknown): MasterDataOption[] => {
  const items = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { items?: unknown[] })?.items)
      ? (payload as { items: unknown[] }).items
      : Array.isArray((payload as { data?: unknown[] })?.data)
        ? (payload as { data: unknown[] }).data
        : [];

  return items
    .filter((item): item is MasterDataOption => {
      const candidate = item as Partial<MasterDataOption>;
      return typeof candidate.id === 'string' && typeof candidate.value === 'string';
    })
    .map((item) => ({ id: item.id, value: item.value }));
};

const searchMasterData = async (
  value: string,
  type: 'LOCATION_COUNTRY' | 'LOCATION_STATE',
  parentId?: string
) => {
  const response = await apiClient.get('/api/v1/master-data/search', {
    params: { value, type, parentId },
  });
  return getMasterDataItems(response.data);
};

const searchCities = async (value: string, parentId: string) => {
  const response = await apiClient.get('/api/v1/master-data/search/cities', {
    params: { value, parentId },
  });
  return getMasterDataItems(response.data);
};

function LocationSearchSelect({
  value,
  options,
  placeholder,
  searchValue,
  onSearchChange,
  onSelect,
  disabled = false,
  isLoading = false,
}: LocationSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  return (
    <Popover open={!disabled && open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          <span className={cn('truncate text-left', !value && 'text-muted-foreground')}>
            {value || placeholder}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <div className="space-y-2 p-3">
          <Input
            ref={inputRef}
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search..."
          />
          {isLoading ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Loading...</p>
          ) : options.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              {searchValue.trim() ? 'No results found' : 'Start typing to search'}
            </p>
          ) : (
            <div className="max-h-56 space-y-1 overflow-y-auto">
              {options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    onSelect(option);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent/80 hover:text-accent-foreground',
                    value === option.value ? 'bg-accent/20 font-medium' : 'bg-transparent'
                  )}
                >
                  <span className="truncate">{option.value}</span>
                  {value === option.value ? <Check className="h-4 w-4 shrink-0" /> : null}
                </button>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

const INITIAL_VALUES: OrganizationCreateFormValues = {
  name: '',
  description: '',
  industry: '',
  website: '',
  foundedYear: '',
  companySize: '',
  type: '',
  contactEmail: '',
  contactPhone: '',
  country: '',
  state: '',
  city: '',
  address: '',
  postalCode: '',
  mission: '',
  vision: '',
  cultureDescription: '',
  benefits: [],
  logoUrl: '',
};

export function OrganizationCreateForm({
  isSubmitting,
  onCancel,
  onSubmit,
}: OrganizationCreateFormProps) {
  const [form, setForm] = useState<OrganizationCreateFormValues>(INITIAL_VALUES);
  const [showMore, setShowMore] = useState(false);
  const [contactPhoneTouched, setContactPhoneTouched] = useState(false);
  const [benefitInput, setBenefitInput] = useState('');
  const [countryOptions, setCountryOptions] = useState<MasterDataOption[]>([]);
  const [stateOptions, setStateOptions] = useState<MasterDataOption[]>([]);
  const [cityOptions, setCityOptions] = useState<MasterDataOption[]>([]);
  const [countrySearch, setCountrySearch] = useState('ind');
  const [stateSearch, setStateSearch] = useState('');
  const [citySearch, setCitySearch] = useState('');
  const [selectedCountryId, setSelectedCountryId] = useState('');
  const [selectedStateId, setSelectedStateId] = useState('');
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  useEffect(() => {
    let isCurrent = true;

    const loadCountries = async () => {
      setLoadingCountries(true);
      try {
        const countries = await searchMasterData(countrySearch.trim() || 'ind', 'LOCATION_COUNTRY');
        if (!isCurrent) return;

        setCountryOptions(countries);
        if (!selectedCountryId) {
          const defaultCountry = countries.find((country) => country.value.toLowerCase() === form.country.toLowerCase());
          if (defaultCountry) {
            setSelectedCountryId(defaultCountry.id);
            setForm((current) => ({ ...current, country: defaultCountry.value }));
          }
        }
      } catch {
        if (isCurrent) {
          setCountryOptions([]);
        }
      } finally {
        if (isCurrent) {
          setLoadingCountries(false);
        }
      }
    };

    const timeoutId = window.setTimeout(loadCountries, 250);
    return () => {
      isCurrent = false;
      window.clearTimeout(timeoutId);
    };
  }, [countrySearch, form.country, selectedCountryId]);

  useEffect(() => {
    if (!selectedCountryId || !stateSearch.trim()) {
      setStateOptions([]);
      setLoadingStates(false);
      return;
    }

    let isCurrent = true;
    const loadStates = async () => {
      setLoadingStates(true);
      try {
        const states = await searchMasterData(stateSearch.trim(), 'LOCATION_STATE', selectedCountryId);
        if (isCurrent) {
          setStateOptions(states);
        }
      } catch {
        if (isCurrent) {
          setStateOptions([]);
        }
      } finally {
        if (isCurrent) {
          setLoadingStates(false);
        }
      }
    };

    const timeoutId = window.setTimeout(loadStates, 250);
    return () => {
      isCurrent = false;
      window.clearTimeout(timeoutId);
    };
  }, [selectedCountryId, stateSearch]);

  useEffect(() => {
    if (!selectedStateId || !citySearch.trim()) {
      setCityOptions([]);
      setLoadingCities(false);
      return;
    }

    let isCurrent = true;
    const loadCities = async () => {
      setLoadingCities(true);
      try {
        const cities = await searchCities(citySearch.trim(), selectedStateId);
        if (isCurrent) {
          setCityOptions(cities);
        }
      } catch {
        if (isCurrent) {
          setCityOptions([]);
        }
      } finally {
        if (isCurrent) {
          setLoadingCities(false);
        }
      }
    };

    const timeoutId = window.setTimeout(loadCities, 250);
    return () => {
      isCurrent = false;
      window.clearTimeout(timeoutId);
    };
  }, [selectedStateId, citySearch]);

  const addBenefit = (event?: React.MouseEvent<HTMLButtonElement>) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const nextBenefit = benefitInput.trim();
    if (!nextBenefit || form.benefits.includes(nextBenefit)) return;
    setForm((current) => ({ ...current, benefits: [...current.benefits, nextBenefit] }));
    setBenefitInput('');
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const phone = form.contactPhone.trim();
    if (phone) {
      const mobileError = getIndianMobileNumberError(phone);
      if (mobileError) {
        setContactPhoneTouched(true);
        setShowMore(true);
        toast.error(mobileError);
        return;
      }
    }

    await onSubmit(form);
  };

  return (
    <form onSubmit={handleCreate} className="space-y-4">
      <div className="space-y-2">
        <Label>Organisation Name *</Label>
        <Input
          value={form.name}
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          placeholder="Acme Inc."
          required
        />
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          value={form.description}
          onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          placeholder="Brief description of your company"
          rows={3}
        />
      </div>

      <Collapsible open={showMore} onOpenChange={setShowMore}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" type="button" className="w-full justify-center gap-2 text-muted-foreground">
            <ChevronDown className={`h-4 w-4 transition-transform ${showMore ? 'rotate-180' : ''}`} />
            {showMore ? 'Less Details' : 'More Details'}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Industry</Label>
              <Input
                value={form.industry}
                onChange={(event) => setForm((current) => ({ ...current, industry: event.target.value }))}
                placeholder="Technology"
              />
            </div>
            <div className="space-y-2">
              <Label>Website</Label>
              <Input
                value={form.website}
                onChange={(event) => setForm((current) => ({ ...current, website: event.target.value }))}
                placeholder="https://example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Founded Year</Label>
              <Input
                type="number"
                value={form.foundedYear}
                onChange={(event) => setForm((current) => ({ ...current, foundedYear: event.target.value }))}
                placeholder="2020"
              />
            </div>
            <div className="space-y-2">
              <Label>Company Size</Label>
              <Select value={form.companySize} onValueChange={(value) => setForm((current) => ({ ...current, companySize: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {COMPANY_SIZES.map((size) => (
                    <SelectItem key={size.value} value={size.value}>
                      {size.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={form.type} onValueChange={(value) => setForm((current) => ({ ...current, type: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {ORGANIZATION_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Contact Email</Label>
              <Input
                type="email"
                value={form.contactEmail}
                onChange={(event) => setForm((current) => ({ ...current, contactEmail: event.target.value }))}
                placeholder="hr@company.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Contact Phone</Label>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-11 items-center rounded-2xl border border-[#CDD0E8] bg-[#E3E4F5] px-4 text-sm font-medium text-[#1D35C0]">
                  +91
                </span>
                <Input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={10}
                  value={form.contactPhone}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      contactPhone: sanitizeIndianMobileNumber(event.target.value),
                    }))
                  }
                  onBlur={() => setContactPhoneTouched(true)}
                  placeholder="Enter mobile number"
                />
              </div>
              {contactPhoneTouched && form.contactPhone.trim() && getIndianMobileNumberError(form.contactPhone) ? (
                <p className="text-sm text-red-500">{getIndianMobileNumberError(form.contactPhone)}</p>
              ) : null}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Country</Label>
              <LocationSearchSelect
                value={form.country}
                options={countryOptions}
                placeholder="Select country"
                searchValue={countrySearch}
                onSearchChange={setCountrySearch}
                isLoading={loadingCountries}
                onSelect={(country) => {
                  setSelectedCountryId(country.id);
                  setSelectedStateId('');
                  setStateSearch('');
                  setCitySearch('');
                  setStateOptions([]);
                  setCityOptions([]);
                  setForm((current) => ({ ...current, country: country.value, state: '', city: '' }));
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>State</Label>
              <LocationSearchSelect
                value={form.state}
                options={stateOptions}
                placeholder={selectedCountryId ? 'Search state' : 'Select country first'}
                searchValue={stateSearch}
                onSearchChange={setStateSearch}
                disabled={!selectedCountryId}
                isLoading={loadingStates}
                onSelect={(state) => {
                  setSelectedStateId(state.id);
                  setCitySearch('');
                  setCityOptions([]);
                  setForm((current) => ({ ...current, state: state.value, city: '' }));
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <LocationSearchSelect
                value={form.city}
                options={cityOptions}
                placeholder={selectedStateId ? 'Search city' : 'Select state first'}
                searchValue={citySearch}
                onSearchChange={setCitySearch}
                disabled={!selectedStateId}
                isLoading={loadingCities}
                onSelect={(city) => setForm((current) => ({ ...current, city: city.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Postal Code</Label>
              <Input
                value={form.postalCode}
                onChange={(event) => setForm((current) => ({ ...current, postalCode: event.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Input
              value={form.address}
              onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Mission</Label>
            <Textarea
              value={form.mission}
              onChange={(event) => setForm((current) => ({ ...current, mission: event.target.value }))}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>Vision</Label>
            <Textarea
              value={form.vision}
              onChange={(event) => setForm((current) => ({ ...current, vision: event.target.value }))}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>Culture Description</Label>
            <Textarea
              value={form.cultureDescription}
              onChange={(event) => setForm((current) => ({ ...current, cultureDescription: event.target.value }))}
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
                disabled={!benefitInput.trim() || form.benefits.includes(benefitInput.trim())}
              >
                Add
              </Button>
            </div>
            {benefitInput.trim() && form.benefits.includes(benefitInput.trim()) && (
              <p className="text-xs text-amber-600">This benefit is already added</p>
            )}
            {form.benefits.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {form.benefits.map((benefit, index) => (
                  <span key={index} className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-sm">
                    {benefit}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setForm((current) => ({
                          ...current,
                          benefits: current.benefits.filter((_, itemIndex) => itemIndex !== index),
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
          <OrganizationLogoUpload
            value={form.logoUrl || null}
            onChange={(url) => setForm((current) => ({ ...current, logoUrl: url ?? '' }))}
          />
        </CollapsibleContent>
      </Collapsible>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Back
        </Button>
        <Button type="submit" className="flex-1" disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create Organisation'}
        </Button>
      </div>
    </form>
  );
}
