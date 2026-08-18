import { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  useEvent,
  useCreateEvent,
  useUpdateEvent,
  usePublishEvent,
  useEventCategories,
} from '@/hooks/useEvents';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { employersApi, eventsApi, masterDataApi } from '@/api/services';
import { MultiSelectDropdown } from '@/components/MultiSelectDropdown';
import { SearchableSelect } from '@/components/SearchableSelect';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RichTextEditor } from '@/components/RichTextEditor';
import { JobDescriptionHtml } from '@/components/JobDescriptionHtml';
import { getJobDescriptionText, sanitizeJobDescriptionHtml } from '@/lib/jobDescriptionHtml';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { hasAdminRole } from '@/auth/roles';
import { useAuthStore } from '@/store/authStore';
import { getYearOptions } from '@/utils/yearOptions';
import type { MasterDataItem, Employer } from '@/types';
import {
  persistJobOrganizations,
  persistSelectedJobOrganizationId,
  readStoredJobOrganizationId,
  resolveJobOrganizations,
  resolveSelectedJobOrganizationId,
  type EmployerMeData,
} from '@/lib/jobOrganizationSync';

interface MasterDataDisplay {
  id: string;
  value: string;
}

interface MasterDataOption {
  id: string;
  value: string;
  slug?: string;
  parentId?: string | null;
}

type EventMode = 'ONLINE' | 'OFFLINE';
type EventRegistrationType = 'INTERNAL' | 'EXTERNAL';

const MASTER_DATA_STALE_TIME = 30 * 1000;

const getErrorMessage = (error: unknown, fallback: string) => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof error.response === 'object' &&
    error.response !== null &&
    'data' in error.response &&
    typeof error.response.data === 'object' &&
    error.response.data !== null &&
    'message' in error.response &&
    typeof error.response.message === 'string'
  ) {
    return error.response.message;
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof error.response === 'object' &&
    error.response !== null &&
    'data' in error.response &&
    typeof error.response.data === 'object' &&
    error.response.data !== null &&
    'message' in error.response.data &&
    typeof error.response.data.message === 'string'
  ) {
    return error.response.data.message;
  }

  return fallback;
};

const EventForm = () => {
  const { id, employerId } = useParams<{ id?: string; employerId?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const isEdit = !!id;
  const isViewMode = Boolean(id) && !location.pathname.endsWith('/edit');

  // Fetch user's organizations
  const userRoles = useAuthStore((s) => s.user?.roles ?? []);
  const token = useAuthStore((s) => s.token);
  const isAdmin = hasAdminRole(userRoles);

  const [organizationId, setOrganizationId] = useState<string | null>(
    () => employerId ?? readStoredJobOrganizationId()
  );

  const {
    data: meData,
    isLoading: meLoading,
  } = useQuery<EmployerMeData>({
    queryKey: ['employer-me'],
    queryFn: employersApi.getMe,
    enabled: !!token && !employerId,
  });

  const {
    data: fallbackOrganizations = [],
    isLoading: fallbackOrganizationsLoading,
  } = useQuery({
    queryKey: ['my-organizations', isAdmin],
    queryFn: async () => {
      if (isAdmin) {
        const res = await employersApi.list({ page: 1, limit: 1000 });
        return res.data;
      }
      return employersApi.listMine();
    },
    enabled: !!token && !employerId,
  });

  // ── Fetch employer details when employerId exists (for display only) ──────────
  const { data: scopedEmployer } = useQuery({
    queryKey: ['employer', employerId],
    queryFn: () => employersApi.getOne(employerId!),
    enabled: Boolean(employerId),
  });

  const organizations = useMemo(
    () => (employerId ? [] : resolveJobOrganizations(meData, fallbackOrganizations)),
    [meData, fallbackOrganizations, employerId]
  );
  const organizationsLoading = !employerId && (meLoading || fallbackOrganizationsLoading);

  const selectedOrganization = organizations.find((org) => org.id === organizationId) ?? null;
  const hasOrganizations = employerId ? true : organizations.length > 0;

  useEffect(() => {
    if (employerId) {
      setOrganizationId(employerId);
      return;
    }

    if (organizationsLoading) return;

    persistJobOrganizations(organizations);

    if (organizations.length === 0) {
      setOrganizationId(null);
      persistSelectedJobOrganizationId(null);
      return;
    }

    const nextOrganizationId = resolveSelectedJobOrganizationId({
      meData,
      organizations,
      storedOrganizationId: readStoredJobOrganizationId(),
    });

    if (organizationId !== nextOrganizationId) {
      setOrganizationId(nextOrganizationId);
    }

    persistSelectedJobOrganizationId(nextOrganizationId);
  }, [employerId, meData, organizations, organizationsLoading, organizationId]);

  const { data: eventData, isLoading } = useEvent(id || '');
  const queryClient = useQueryClient();
  const { data: categoriesData, isLoading: categoriesLoading } = useEventCategories();

  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const publishEvent = usePublishEvent();

  const [form, setForm] = useState(() => {
    const now = new Date();
    return {
      title: '',
      description: '',
      categoryId: '',
      mode: 'OFFLINE' as EventMode,
      locationId: '',
      meetingUrl: '',
      isMeetingUrlPublished: false,
      registrationType: 'INTERNAL' as EventRegistrationType,
      externalRegistrationUrl: '',
      capacity: '',
      startDate: now.toISOString().split('T')[0],
      startTime: now.toTimeString().slice(0, 5),
      endDate: '',
      endTime: '',
      isFree: true,
      price: '',
      status: 'DRAFT',
    };
  });

  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedExperience, setSelectedExperience] = useState<string[]>([]);
  const [selectedEducation, setSelectedEducation] = useState<string[]>([]);
  const [selectedSpecializations, setSelectedSpecializations] = useState<string[]>([]);
  const [bannerImageUrl, setBannerImageUrl] = useState<string>('');
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const editPopulatedRef = useRef(false);

  const [eventLocationSearch, setEventLocationSearch] = useState('');
  const [selectedCityOption, setSelectedCityOption] = useState<{ id: string; value: string } | null>(null);

  const [skillSearch, setSkillSearch] = useState('');
  const [selectedSkillOptions, setSelectedSkillOptions] = useState<{ id: string; value: string }[]>([]);
  const [experienceSearch, setExperienceSearch] = useState('');
  const [selectedExperienceOptions, setSelectedExperienceOptions] = useState<{ id: string; value: string }[]>([]);
  const [educationSearch, setEducationSearch] = useState('');
  const [specializationSearch, setSpecializationSearch] = useState('');
  const [selectedEducationOptions, setSelectedEducationOptions] = useState<MasterDataOption[]>([]);
  const [selectedSpecializationOptions, setSelectedSpecializationOptions] = useState<MasterDataOption[]>([]);

  // Search terms for backend search
  const [searchTerms, setSearchTerms] = useState({
    country: '',
    state: '',
    city: '',
  });

  const { data: countriesData = [], isLoading: countriesLoading } = useQuery({
    queryKey: ['countries'],
    queryFn: eventsApi.getCountries,
    staleTime: MASTER_DATA_STALE_TIME,
    refetchOnWindowFocus: true,
  });
  const { data: statesData = [], isLoading: statesLoading } = useQuery({
    queryKey: ['states', selectedCountries],
    queryFn: async () => {
      if (!selectedCountries.length) return [];

      const countrySlugs = selectedCountries
        .map((countryId) => countriesData.find((c) => c.id === countryId)?.slug)
        .filter((slug): slug is string => Boolean(slug));

      if (!countrySlugs.length) return [];

      const results = await Promise.all(
        countrySlugs.map((slug) => eventsApi.getStatesByCountrySlug(slug))
      );

      return results.flat();
    },
    enabled: selectedCountries.length > 0 && countriesData.length > 0,
    staleTime: MASTER_DATA_STALE_TIME,
    refetchOnWindowFocus: true,
    keepPreviousData: true,
  });
  const { data: citiesData = [], isLoading: citiesLoading } = useQuery({
    queryKey: ['cities', selectedStates],
    queryFn: async () => {
      if (!selectedStates.length) return [];

      const allCities: typeof citiesData = [];
      for (const stateId of selectedStates) {
        const state = statesData.find((s) => s.id === stateId);
        if (!state?.slug) continue;

        const cities = await eventsApi.getCitiesByStateSlug(state.slug);
        allCities.push(...cities);
      }

      return allCities;
    },
    enabled: selectedStates.length > 0 && statesData.length > 0,
    staleTime: MASTER_DATA_STALE_TIME,
    refetchOnWindowFocus: true,
    keepPreviousData: true,
  });
  const { data: skillsData = [], isLoading: skillsLoading } = useQuery({
    queryKey: ['skills'],
    queryFn: eventsApi.getSkills,
    staleTime: MASTER_DATA_STALE_TIME,
    refetchOnWindowFocus: true,
  });
  const { data: experienceLevelsData = [], isLoading: experienceLoading } = useQuery({
    queryKey: ['experience-levels'],
    queryFn: eventsApi.getExperienceLevels,
    staleTime: MASTER_DATA_STALE_TIME,
    refetchOnWindowFocus: true,
  });
  const { data: educationData = [], isLoading: educationLoading } = useQuery({
    queryKey: ['education-levels'],
    queryFn: eventsApi.getEducationLevels,
    staleTime: MASTER_DATA_STALE_TIME,
    refetchOnWindowFocus: true,
  });

  // Search queries for backend search (enabled only when search term >= 3 chars)
  const { data: searchedCountries = [] } = useQuery({
    queryKey: ['search-countries', searchTerms.country],
    queryFn: () => eventsApi.searchMasterData(searchTerms.country, 'LOCATION_COUNTRY'),
    enabled: Boolean(searchTerms.country?.trim()),
    staleTime: MASTER_DATA_STALE_TIME,
    refetchOnWindowFocus: true,
  });

  const { data: searchedStates = [] } = useQuery({
    queryKey: ['search-states', searchTerms.state],
    queryFn: () => eventsApi.searchMasterData(searchTerms.state, 'LOCATION_STATE'),
    enabled: Boolean(searchTerms.state?.trim()),
    staleTime: MASTER_DATA_STALE_TIME,
    refetchOnWindowFocus: true,
  });

  const { data: searchedCities = [] } = useQuery({
    queryKey: ['search-cities', searchTerms.city],
    queryFn: () => eventsApi.searchMasterData(searchTerms.city, 'LOCATION_CITY'),
    enabled: Boolean(searchTerms.city?.trim()),
    staleTime: MASTER_DATA_STALE_TIME,
    refetchOnWindowFocus: true,
  });

  const { data: searchedEventLocations = [], isLoading: eventLocationLoading } = useQuery({
    queryKey: ['event-location-search', eventLocationSearch],
    queryFn: () =>
      eventsApi.searchMasterData(eventLocationSearch, 'LOCATION_CITY'),
    enabled: Boolean(eventLocationSearch?.trim()),
    staleTime: MASTER_DATA_STALE_TIME,
    refetchOnWindowFocus: true,
  });

  const { data: skillSearchResults = [], isLoading: skillSearchLoading } = useQuery({
    queryKey: ['skill-search', skillSearch],
    queryFn: () => eventsApi.searchMasterData(skillSearch, 'SKILL'),
    enabled: Boolean(skillSearch?.trim()),
    staleTime: MASTER_DATA_STALE_TIME,
    refetchOnWindowFocus: true,
  });

  const { data: experienceSearchResults = [], isLoading: experienceSearchLoading } = useQuery({
    queryKey: ['experience-search', experienceSearch],
    queryFn: () => eventsApi.searchMasterData(experienceSearch, 'EXPERIENCE_LEVEL'),
    enabled: Boolean(experienceSearch?.trim()),
    staleTime: MASTER_DATA_STALE_TIME,
    refetchOnWindowFocus: true,
  });

  const { data: educationSearchResults = [], isLoading: educationSearchLoading } = useQuery({
    queryKey: ['education-search', educationSearch],
    queryFn: () => eventsApi.searchMasterData(educationSearch, 'EDUCATION_LEVEL'),
    enabled: Boolean(educationSearch?.trim()),
    staleTime: MASTER_DATA_STALE_TIME,
    refetchOnWindowFocus: true,
  });
  const { data: specializationSearchResults = [], isLoading: specializationSearchLoading } = useQuery({
    queryKey: ['specialization-search', specializationSearch, selectedEducation],
    queryFn: () => eventsApi.searchMasterData(specializationSearch, 'SPECIALIZATION'),
    enabled: Boolean(specializationSearch?.trim()) && selectedEducation.length > 0,
    staleTime: MASTER_DATA_STALE_TIME,
    refetchOnWindowFocus: true,
  });

  const { data: currentLocationItem } = useQuery({
    queryKey: ['master-data-item', form.locationId],
    queryFn: () => masterDataApi.getById(form.locationId!),
    enabled: isEdit && !!form.locationId && !selectedCityOption,
    staleTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    if (currentLocationItem && !selectedCityOption) {
      setSelectedCityOption({ id: currentLocationItem.id, value: currentLocationItem.value });
    }
  }, [currentLocationItem]);

  function withSelectedOption(
    options: { id: string; value: string }[],
    value: string,
    selected?: { id: string; value: string } | null
  ) {
    if (!value || options.some((option) => option.id === value)) {
      return options;
    }

    return [selected || { id: value, value }, ...options];
  }

  const baseLocationOptions = useMemo(
    () =>
      searchedEventLocations.map((item: MasterDataItem) => ({
        id: item.id,
        value: item.value,
      })),
    [searchedEventLocations]
  );

  const displayLocationOptions = useMemo(
    () =>
      withSelectedOption(baseLocationOptions, form.locationId, selectedCityOption),
    [baseLocationOptions, form.locationId, selectedCityOption]
  );

  const countries = countriesData?.data || countriesData;
  const states = statesData?.data || statesData;
  const cities = citiesData?.data || citiesData;
  const skills = skillsData?.data || skillsData;
  const experienceLevels = experienceLevelsData?.data || experienceLevelsData;
  const isCountryLoading = countriesLoading;
  const isStateLoading = statesLoading;
  const isCityLoading = citiesLoading;
  const isTagLoading = isEdit && (skillsLoading || experienceLoading || educationLoading);

 // When education changes: clear orphaned specializations (create/edit flow)
  // On edit load: fetch and pre-fill selected specializations from saved tags
 useEffect(() => {
    if (!selectedEducation.length) {
      setSelectedSpecializations([]);
      setSelectedSpecializationOptions([]);
      return;
    }

    // Only pre-fill on edit, and only once
    if (!isEdit || !eventData) return;
    if (selectedSpecializations.length > 0) return;

    // Wait until the edit form has been populated before restoring
    // specializations — editPopulatedRef ensures education IDs are final
    if (!editPopulatedRef.current) return;

    let isCurrent = true;

    const restoreSpecializations = async () => {
      try {
        const event = eventData?.data || eventData;
        const tagIds = (event.tags || []).map((tag: { id: string }) => tag.id);

        const results = await Promise.all(
          selectedEducation.map((educationId) =>
            eventsApi.getSpecializationsByEducationId(educationId)
          )
        );

        if (!isCurrent) return;

        const allSpecs = results.flat().map((item: MasterDataItem) => ({
          id: item.id,
          value: item.value,
          parentId: item.parentId,
        }));

        const matched = allSpecs.filter((spec) => tagIds.includes(spec.id));

        if (matched.length) {
          setSelectedSpecializations(matched.map((s) => s.id));
          setSelectedSpecializationOptions(matched);
        }
      } catch (error) {
        console.error('Failed to restore specializations', error);
      }
    };

    restoreSpecializations();

    return () => {
      isCurrent = false;
    };
  }, [selectedEducation, isEdit, eventData, selectedSpecializations.length]);

  // Specialization edit restore is handled in the selectedEducation useEffect above

  const filteredStates = states.filter(
    (state: MasterDataItem) => state.parentId !== null && selectedCountries.includes(state.parentId)
  );

  const filteredCities = cities.filter(
    (city: MasterDataItem) => city.parentId !== null && selectedStates.includes(city.parentId)
  );

  // Merge search results with filtered data
  const finalCountries = searchTerms.country?.trim() ? searchedCountries : countries;
  const finalStates = searchTerms.state?.trim() ? searchedStates : filteredStates;
  const finalCities = searchTerms.city?.trim() ? searchedCities : filteredCities;
  const skillDropdownOptions = useMemo(() => {
    const results = skillSearchResults.map((item: MasterDataItem) => ({
      id: item.id,
      value: item.value,
    }));
    const notInResults = selectedSkillOptions.filter((o) => !results.find((r) => r.id === o.id));
    return [...notInResults, ...results];
  }, [skillSearchResults, selectedSkillOptions]);

  const experienceDropdownOptions = useMemo(() => {
    const results = experienceSearchResults.map((item: MasterDataItem) => ({
      id: item.id,
      value: item.value,
    }));
    const notInResults = selectedExperienceOptions.filter((o) => !results.find((r) => r.id === o.id));
    return [...notInResults, ...results];
  }, [experienceSearchResults, selectedExperienceOptions]);

  const educationDropdownOptions = useMemo(() => {
    const results = educationSearchResults.map((item: MasterDataItem) => ({
      id: item.id,
      value: item.value,
      slug: item.slug,
      parentId: item.parentId,
    }));
    const notInResults = selectedEducationOptions.filter((o) => !results.find((r) => r.id === o.id));
    return [...notInResults, ...results];
  }, [educationSearchResults, selectedEducationOptions]);
  const specializationDropdownOptions = useMemo(() => {
    const results = specializationSearchResults
      .filter((item: MasterDataItem) =>
        !item.parentId || selectedEducation.includes(item.parentId)
      )
      .map((item: MasterDataItem) => ({
        id: item.id,
        value: item.value,
        parentId: item.parentId,
      }));
    const notInResults = selectedSpecializationOptions.filter(
      (o) => !results.find((r) => r.id === o.id)
    );
    return [...notInResults, ...results];
  }, [specializationSearchResults, selectedSpecializationOptions, selectedEducation]);
  // Populate form when editing
  useEffect(() => {
    if (editPopulatedRef.current) return;
    if (
      isEdit &&
      eventData &&
      skillsData &&
      experienceLevelsData &&
      educationData
    ) {
      const event = eventData?.data || eventData;
      const startDate = new Date(event.startDate);
      const endDate = new Date(event.endDate);
      
      setForm({
        title: event.title || '',
        description: event.description || '',
        categoryId:
          typeof event.categoryId === 'string' ? event.categoryId : event.categoryId?.id || '',
        mode: event.mode || 'OFFLINE',
        locationId:
          typeof event.locationId === 'string' ? event.locationId : event.locationId?.id || '',
        meetingUrl: event.meetingUrl || '',
        isMeetingUrlPublished: Boolean(event.isMeetingUrlPublished),
        registrationType: event.registrationType || 'INTERNAL',
        externalRegistrationUrl: event.externalRegistrationUrl || '',
        capacity: event.capacity?.toString() || '',
        startDate: startDate.toISOString().split('T')[0],
        startTime: startDate.toTimeString().slice(0, 5),
        endDate: endDate.toISOString().split('T')[0],
        endTime: endDate.toTimeString().slice(0, 5),
        isFree: event.isFree !== false,
        price: event.price?.toString() || '',
        status: event.status || 'DRAFT',
      });

      // Map tagIds to appropriate selection states based on tag types
      const tagIds = (event.tags || []).map(tag => tag.id);

      const selectedCountriesData = countries.filter(c => tagIds.includes(c.id));
      const selectedStatesData = states.filter(s => tagIds.includes(s.id));
      const selectedCitiesData = cities.filter(c => tagIds.includes(c.id));
      const selectedStateIds = Array.from(
        new Set([
          ...selectedStatesData.map(s => s.id),
          ...selectedCitiesData
            .map(c => c.parentId)
            .filter((parentId): parentId is string => Boolean(parentId)),
        ])
      );
      const inferredCountryIds = selectedCountriesData.length
        ? selectedCountriesData.map((c) => c.id)
        : Array.from(
            new Set([
              ...selectedStatesData
                .map((s) => s.parentId)
                .filter((parentId): parentId is string => Boolean(parentId)),
              ...selectedCitiesData
                .map((c) => c.parentId)
                .filter((parentId): parentId is string => Boolean(parentId)),
            ])
          );

      setSelectedCountries(inferredCountryIds);
      setSelectedStates(selectedStateIds);
      setSelectedCities(selectedCitiesData.map(c => c.id));

      const skillIds = tagIds.filter((id) => skillsData.some((item) => item.id === id));
      setSelectedSkills(skillIds);
      setSelectedSkillOptions(
        skillIds
          .map((id) => skillsData.find((item) => item.id === id))
          .filter((item): item is MasterDataItem => !!item)
          .map((item) => ({ id: item.id, value: item.value }))
      );

      const experienceIds = tagIds.filter((id) => experienceLevelsData.some((item) => item.id === id));
      setSelectedExperience(experienceIds);
      setSelectedExperienceOptions(
        experienceIds
          .map((id) => experienceLevelsData.find((item) => item.id === id))
          .filter((item): item is MasterDataItem => !!item)
          .map((item) => ({ id: item.id, value: item.value }))
      );

      const educationIds = tagIds.filter((id) => educationData.some((item) => item.id === id));
      setSelectedEducation(educationIds);
      setSelectedEducationOptions(
        educationIds
          .map((id) => educationData.find((item) => item.id === id))
          .filter((item): item is MasterDataItem => !!item)
          .map((item) => ({ id: item.id, value: item.value, slug: item.slug, parentId: item.parentId }))
      );

      setSelectedSpecializations([]);
      setSelectedSpecializationOptions([]);

      // Extract year tags (4-digit numbers from tagIds)
      const yearTags = tagIds.filter(id => /^\d{4}$/.test(id));
      setSelectedYears(yearTags);
      setBannerImageUrl(event.bannerImage || '');

      // Mark done once the full country → state → city cascade has resolved.
      // If we have country tags but states haven't loaded yet, keep re-running.
      // If we have state tags but cities haven't loaded yet, keep re-running.
      const waitingForStates = inferredCountryIds.length > 0 && states.length === 0;
      const waitingForCities = selectedStateIds.length > 0 && cities.length === 0;
      if (!waitingForStates && !waitingForCities) {
        editPopulatedRef.current = true;
      }
    }
  }, [
    isEdit,
    eventData,
    skillsData,
    experienceLevelsData,
    educationData,
    countries,
    states,
    cities,
  ]);

  const categories: MasterDataDisplay[] = (categoriesData || []).map((item: MasterDataItem) => ({
    id: item.id,
    value: item.value,
  }));

  const years: MasterDataDisplay[] = useMemo(() => {
    const generatedYears = getYearOptions();

    const missingSelectedYears = selectedYears
      .filter(
        (year) =>
          !generatedYears.some((option) => option.id === year)
      )
      .map((year) => ({
        id: year,
        value: year,
      }));

    return [...missingSelectedYears, ...generatedYears];
  }, [selectedYears]);

  const event = eventData?.data || eventData;
  const status = event?.status?.toUpperCase?.() ?? '';
  const isCancelled = status === 'CANCELLED';
  const isCompleted = status === 'COMPLETED';
  const isPublished = status === 'PUBLISHED' || status === 'ACTIVE';
  const isReadOnly = isViewMode || isCompleted;

  if ((isEdit && isLoading) || categoriesLoading || isTagLoading || organizationsLoading || !organizationId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const handleSave = async (publish: boolean) => {
    // Validation
    if (!form.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!getJobDescriptionText(form.description)) {
      toast.error('Description is required');
      return;
    }
    if (!form.categoryId) {
      toast.error('Category is required');
      return;
    }
    if (!form.capacity) {
      toast.error('Capacity is required');
      return;
    }
    if (!form.startDate || !form.startTime) {
      toast.error('Start date and time are required');
      return;
    }
    if (!form.endDate || !form.endTime) {
      toast.error('End date and time are required');
      return;
    }

    const startDateTimeValue = new Date(`${form.startDate}T${form.startTime}:00`);
    const endDateTimeValue = new Date(`${form.endDate}T${form.endTime}:00`);

    if (endDateTimeValue < startDateTimeValue) {
      toast.error('End date and time must be greater than or equal to start date and time');
      return;
    }
    if (form.mode !== 'ONLINE' && !form.locationId) {
      toast.error('Location is required for offline/hybrid events');
      return;
    }
    if (!form.isFree && !form.price) {
      toast.error('Price is required for paid events');
      return;
    }
    if (form.isMeetingUrlPublished && !form.meetingUrl.trim()) {
      toast.error('Meeting URL is required before publishing it');
      return;
    }
    if (form.registrationType === 'EXTERNAL' && !form.externalRegistrationUrl.trim()) {
      toast.error('External registration URL is required for External registration type');
      return;
    }

    // Merge all tag selections
    const locationTags = [
      ...selectedCountries,
      ...selectedStates,
      ...selectedCities,
    ];

    const allTags = [
      ...locationTags,
      ...selectedSkills,
      ...selectedExperience,
      ...selectedEducation,
      ...selectedSpecializations,
      ...selectedYears,
    ];

    // Validate at least one tag is selected
    if (allTags.length === 0) {
      toast.error('Select at least one tag (Location, Skill, Experience Level, Education, Specialization, or Year of Passing)');
      return;
    }

    const startDateTime = startDateTimeValue.toISOString();
    const endDateTime = endDateTimeValue.toISOString();

    const payload: Record<string, unknown> = {
      title: form.title,
      description: sanitizeJobDescriptionHtml(form.description),
      categoryId: form.categoryId,
      mode: form.mode,
      meetingUrl: form.meetingUrl.trim() || null,
      isMeetingUrlPublished: form.isMeetingUrlPublished,
      registrationType: form.registrationType,
      externalRegistrationUrl: form.registrationType === 'EXTERNAL' && form.externalRegistrationUrl.trim() ? form.externalRegistrationUrl.trim() : undefined,
      capacity: Number(form.capacity),
      startDate: startDateTime,
      endDate: endDateTime,
      isFree: form.isFree,
    };

    if (form.mode !== 'ONLINE') {
      payload.locationId = form.locationId;
    }

    if (!form.isFree) {
      payload.price = Number(form.price);
    }

    if (bannerImageUrl) {
      payload.bannerImage = bannerImageUrl;
    }

    payload.tagIds = Array.from(new Set(allTags));
    try {
      const status = event?.status?.toUpperCase?.() ?? '';
      if (isEdit) {
        await updateEvent.mutateAsync({
          id: id!,
          ...payload,
          ...(publish ? {} : { status: 'DRAFT' }),
        });
        if (publish && status !== 'ACTIVE') {
          await publishEvent.mutateAsync(id!);
        }
      } else {
        const data = await createEvent.mutateAsync({ organizationId, ...payload });
        const newId = data?.data?.id || data?.id;
        if (publish && newId) {
          await publishEvent.mutateAsync(newId);
        }
      }
      toast.success(isEdit ? 'Event updated!' : 'Event created!');
      await queryClient.invalidateQueries({ queryKey: ['events'] });
      await queryClient.refetchQueries({ queryKey: ['events'] });
      navigate(
        isEdit
          ? employerId
            ? `/employers/${employerId}/events/${id}`
            : `/events/${id}`
          : employerId
            ? `/employers/${employerId}`
            : '/events'
      );
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Failed to save event'));
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              navigate(
                employerId
                  ? `/employers/${employerId}`
                  : '/events'
              )
            }
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {isReadOnly ? 'View Event' : isEdit ? 'Edit Event' : 'Create New Event'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isReadOnly ? 'Review details for this event' : 'Fill in the details for your event'}
            </p>
          </div>
        </div>
        {isViewMode && id && !isCompleted && (
          <Button
            onClick={() =>
              navigate(
                employerId
                  ? `/employers/${employerId}/events/${id}/edit`
                  : `/events/${id}/edit`
              )
            }
          >
            Edit
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Event Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Healthcare Career Summit 2026"
              disabled={isReadOnly}
            />
          </div>

          <div className="space-y-2">
            <Label>Organization</Label>
            <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm">
              <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span>{selectedOrganization?.name ?? scopedEmployer?.name ?? organizationId ?? 'Not available'}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description *</Label>
            {isReadOnly ? (
              <div className="min-h-[120px] rounded-md border bg-muted/30 p-3">
                <JobDescriptionHtml
                  description={form.description}
                  emptyText="No description"
                />
              </div>
            ) : (
              <RichTextEditor
                value={form.description}
                onChange={(description) =>
                  setForm((f) => ({ ...f, description }))
                }
                placeholder="Detailed event description..."
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select
                value={form.categoryId}
                onValueChange={(v) => setForm((f) => ({ ...f, categoryId: v }))}
                disabled={isReadOnly}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Mode *</Label>
              <Select
                value={form.mode}
                onValueChange={(v) => setForm((f) => ({ ...f, mode: v as EventMode }))}
                disabled={isReadOnly}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ONLINE">🌐 Online</SelectItem>
                  <SelectItem value="OFFLINE">📍 Offline</SelectItem>
                  {/* <SelectItem value="HYBRID">🔄 Hybrid</SelectItem> */}
                </SelectContent>
              </Select>
            </div>
          </div>

          {form.mode !== 'ONLINE' && (
            <div className="space-y-2">
              <Label>Event Location *</Label>
              <SearchableSelect
                value={form.locationId}
                onChange={(v) => {
                  const option = displayLocationOptions.find((o) => o.id === v);
                  setSelectedCityOption(option ?? null);
                  setForm((f) => ({ ...f, locationId: v }));
                }}
                options={displayLocationOptions}
                placeholder="Search city..."
                disabled={isReadOnly}
                isLoading={eventLocationLoading}
                onSearch={setEventLocationSearch}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Registration Type *</Label>
              <Select
                value={form.registrationType}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, registrationType: v as EventRegistrationType }))
                }
                disabled={isReadOnly}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INTERNAL">Internal</SelectItem>
                  <SelectItem value="EXTERNAL">External</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Capacity *</Label>
              <Input
                type="number"
                value={form.capacity}
                onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
                placeholder="200"
                disabled={isReadOnly}
              />
            </div>
          </div>

          {form.registrationType === 'EXTERNAL' && (
            <div className="space-y-2">
              <Label>External Registration URL *</Label>
              <Input
                type="url"
                value={form.externalRegistrationUrl}
                onChange={(e) => setForm((f) => ({ ...f, externalRegistrationUrl: e.target.value }))}
                placeholder="https://example.com/register"
                disabled={isReadOnly}
              />
              <p className="text-xs text-muted-foreground">Attendees will be redirected here to register.</p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Meeting URL</Label>
            <Input
              type="url"
              value={form.meetingUrl}
              onChange={(e) => setForm((f) => ({ ...f, meetingUrl: e.target.value }))}
              placeholder="https://meet.example.com/session"
              disabled={isReadOnly}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-1">
              <Label htmlFor="meeting-url-published">
                Publish meeting URL
              </Label>
              <p className="text-sm text-muted-foreground">
                Enable this when the meeting URL should be visible to attendees.
              </p>
            </div>
            <Switch
              id="meeting-url-published"
              checked={form.isMeetingUrlPublished}
              onCheckedChange={(checked) => setForm((f) => ({ ...f, isMeetingUrlPublished: checked }))}
              disabled={isReadOnly || updateEvent.isPending}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date *</Label>
              <Input
                type="date"
                value={form.startDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                disabled={isReadOnly}
              />
            </div>
            <div className="space-y-2">
              <Label>Start Time *</Label>
              <Input
                type="time"
                value={form.startTime}
                onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                disabled={isReadOnly}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>End Date *</Label>
              <Input
                type="date"
                value={form.endDate}
                min={form.startDate || new Date().toISOString().split('T')[0]}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                disabled={isReadOnly}
              />
            </div>
            <div className="space-y-2">
              <Label>End Time *</Label>
              <Input
                type="time"
                value={form.endTime}
                onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                disabled={isReadOnly}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Banner Image URL</Label>
            <Input
              value={bannerImageUrl}
              onChange={(e) => setBannerImageUrl(e.target.value)}
              placeholder="https://example.com/banner.jpg"
              disabled={isReadOnly}
            />
            {bannerImageUrl && (
              <div className="mt-2">
                <img
                  src={bannerImageUrl}
                  alt="banner preview"
                  className="max-h-40 rounded object-cover"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pricing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Checkbox
              id="isFree"
              checked={form.isFree}
              onCheckedChange={(checked) =>
                setForm((f) => ({ ...f, isFree: checked as boolean }))
              }
              disabled={isReadOnly}
            />
            <Label htmlFor="isFree" className="font-normal cursor-pointer">
              This is a free event
            </Label>
          </div>

          {!form.isFree && (
            <div className="space-y-2">
              <Label>Price (₹) *</Label>
              <Input
                type="number"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                placeholder="499"
                disabled={isReadOnly}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tags</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <MultiSelectDropdown
                label="Country"
                options={finalCountries.map((country) => ({ id: country.id, value: country.value }))}
                selected={selectedCountries}
                onChange={(values) => {
                  const removedCountryIds = selectedCountries.filter(id => !values.includes(id));
                  if (removedCountryIds.length > 0) {
                    const stateIdsToRemove = states
                      .filter(s => s.parentId !== null && removedCountryIds.includes(s.parentId))
                      .map(s => s.id);
                    const newStates = selectedStates.filter(id => !stateIdsToRemove.includes(id));
                    const cityIdsToRemove = cities
                      .filter(c => c.parentId !== null && stateIdsToRemove.includes(c.parentId))
                      .map(c => c.id);
                    const newCities = selectedCities.filter(id => !cityIdsToRemove.includes(id));
                    setSelectedCountries(values);
                    setSelectedStates(newStates);
                    setSelectedCities(newCities);
                  } else {
                    setSelectedCountries(values);
                  }
                }}
                disabled={isReadOnly}
                isLoading={isCountryLoading}
                placeholder="Select countries..."
                onSearch={(value) =>
                  setSearchTerms((prev) => ({ ...prev, country: value }))
                }
              />
            </div>
            <MultiSelectDropdown
              label="State"
              options={finalStates.map((state) => ({ id: state.id, value: state.value }))}
              selected={selectedStates}
              onChange={(values) => {
                const removedStateIds = selectedStates.filter(id => !values.includes(id));
                if (removedStateIds.length > 0) {
                  const cityIdsToRemove = cities
                    .filter(c => c.parentId !== null && removedStateIds.includes(c.parentId))
                    .map(c => c.id);
                  setSelectedStates(values);
                  setSelectedCities(selectedCities.filter(id => !cityIdsToRemove.includes(id)));
                } else {
                  setSelectedStates(values);
                }
              }}
              disabled={isReadOnly}
              isLoading={isStateLoading}
              placeholder="Select states..."
              onSearch={(value) =>
                setSearchTerms((prev) => ({ ...prev, state: value }))
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <MultiSelectDropdown
              label="City"
              options={finalCities.map((city) => ({ id: city.id, value: city.value }))}
              selected={selectedCities}
              onChange={setSelectedCities}
              disabled={isReadOnly}
              isLoading={isCityLoading}
              placeholder="Select cities..."
              onSearch={(value) =>
                setSearchTerms((prev) => ({ ...prev, city: value }))
              }
            />
            <MultiSelectDropdown
              label="Skills"
              options={skillDropdownOptions}
              selected={selectedSkills}
              onChange={(values) => {
                setSelectedSkills(values);
                setSelectedSkillOptions(
                  values
                    .map((id) => skillDropdownOptions.find((o) => o.id === id))
                    .filter((o): o is { id: string; value: string } => !!o)
                );
              }}
              disabled={isReadOnly}
              isLoading={skillSearchLoading}
              placeholder="Type to search skills."
              onSearch={setSkillSearch}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <MultiSelectDropdown
              label="Experience Level"
              options={experienceDropdownOptions}
              selected={selectedExperience}
              onChange={(values) => {
                setSelectedExperience(values);
                setSelectedExperienceOptions(
                  values
                    .map((id) => experienceDropdownOptions.find((o) => o.id === id))
                    .filter((o): o is { id: string; value: string } => !!o)
                );
              }}
              disabled={isReadOnly}
              isLoading={experienceSearchLoading}
              placeholder="Type to search experience levels."
              onSearch={setExperienceSearch}
            />
            <MultiSelectDropdown
              label="Education"
              options={educationDropdownOptions}
              selected={selectedEducation}
              onChange={(values) => {
                setSelectedEducation(values);
                setSelectedEducationOptions(
                  values
                    .map((id) => educationDropdownOptions.find((o) => o.id === id))
                    .filter((o): o is MasterDataOption => !!o)
                );
                setSelectedSpecializations((current) => {
                  if (!values.length) return [];

                  return current.filter((id) => {
                    const option = selectedSpecializationOptions.find((o) => o.id === id);
                    return !option?.parentId || values.includes(option.parentId);
                  });
                });
                setSelectedSpecializationOptions((current) =>
                  values.length
                    ? current.filter((option) => !option.parentId || values.includes(option.parentId))
                    : []
                );
              }}
              disabled={isReadOnly}
              isLoading={educationSearchLoading}
              placeholder="Type to search qualifications."
              onSearch={setEducationSearch}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
           <MultiSelectDropdown
              label="Specialization"
              options={specializationDropdownOptions}
              selected={selectedSpecializations}
              onChange={(values) => {
                setSelectedSpecializations(values);
                setSelectedSpecializationOptions(
                  values
                    .map((id) => specializationDropdownOptions.find((o) => o.id === id))
                    .filter((o): o is MasterDataOption => !!o)
                );
              }}
              disabled={isReadOnly || selectedEducation.length === 0}
              isLoading={specializationSearchLoading}
              placeholder={
                selectedEducation.length
                  ? 'Type to search specializations.'
                  : 'Select education first'
              }
              onSearch={setSpecializationSearch}
            />
            <MultiSelectDropdown
              label="Year of Passing"
              options={years}
              selected={selectedYears}
              onChange={setSelectedYears}
              disabled={isReadOnly}
              placeholder="Select passing year"
            />
          </div>
        </CardContent>
      </Card>

      {!isReadOnly && (
        <div className="flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={() =>
              navigate(
                employerId
                  ? `/employers/${employerId}`
                  : '/events'
              )
            }
          >
            Cancel
          </Button>
          {!isPublished && (
            <Button
              variant="secondary"
              onClick={() => handleSave(false)}
              disabled={createEvent.isPending || updateEvent.isPending}
            >
              Save as Draft
            </Button>
          )}
          <Button
            onClick={() => handleSave(true)}
            disabled={createEvent.isPending || updateEvent.isPending}
          >
            Save & Publish
          </Button>
        </div>
      )}
    </div>
  );
};

export default EventForm;
