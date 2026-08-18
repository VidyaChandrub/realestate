import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DataTable, type Column } from '@/components/DataTable';
import { MultiSelectDropdown } from '@/components/MultiSelectDropdown';
import { Button } from '@/components/ui/button';
import { eventsApi } from '@/api/services';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { getYearOptions } from '@/utils/yearOptions';
import type { EventRegistration, EventRegistrationsResponse, MasterDataItem } from '@/types';
import { FilterPanel } from '@/components/FilterPanel';

type RegistrationRow = EventRegistration & Record<string, unknown>;
type AnyRecord = Record<string, unknown>;

interface ExperienceItem {
  jobTitle?: unknown;
  companyName?: unknown;
  years?: unknown;
  months?: unknown;
}

interface EducationItem {
  highestQualificationId?: unknown;
  degreeName?: unknown;
  specialization?: unknown;
  universityName?: unknown;
  yearOfPassing?: unknown;
}

interface JobPreferences {
  employmentType?: unknown;
  workMode?: unknown;
  shiftPreference?: unknown;
  availableJoiningDate?: unknown;
  preferredLocationIds?: unknown;
}

interface UserProfile {
  skills?: unknown;
  highestQualificationId?: unknown;
  experienceLevelId?: unknown;
  countryId?: unknown;
  stateId?: unknown;
  currentCityId?: unknown;
  experiences?: unknown;
  education?: unknown;
  jobPreferences?: unknown;
}

interface RegistrationFilters {
  search: string;
  country: string[];
  states: string[];
  cities: string[];
  skills: string[];
  experience: string[];
  education: string[];
  specialization: string[];
  year: string[];
}

const defaultFilters: RegistrationFilters = {
  search: '',
  country: [],
  states: [],
  cities: [],
  skills: [],
  experience: [],
  education: [],
  specialization: [],
  year: [],
};

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const normalizeCsvValue = (value: unknown) => {
  if (value == null) return '';
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
};

const escapeCsvValue = (value: string) => {
  const normalized = value.replace(/"/g, '""');
  return /[",\n]/.test(normalized) ? `"${normalized}"` : normalized;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isLikelyUuid = (value: string) => UUID_PATTERN.test(value.trim());

const safeDisplayValue = (value: unknown) => {
  if (value == null) return '';
  const text = String(value).trim();
  if (!text || isLikelyUuid(text)) return '';
  return text;
};

const mapIdsToNames = (ids: unknown, mapper: Map<string, string>) => {
  if (!Array.isArray(ids)) return '';
  return ids
    .map((id) => mapper.get(String(id)))
    .map((value) => safeDisplayValue(value))
    .filter(Boolean)
    .join(', ');
};

interface MasterDataSearchResponse {
  items?: MasterDataItem[];
  data?: {
    items?: MasterDataItem[];
  } | MasterDataItem[];
}

const getSearchItems = (response: MasterDataSearchResponse | MasterDataItem[]): MasterDataItem[] => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.items)) return response.data.items;
  return [];
};

const debounce = <T extends (...args: string[]) => void>(fn: T, delay: number) => {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

const searchMasterData = async (value: string, type: string): Promise<MasterDataItem[]> => {
  const query = value?.trim();
  if (!query) return [];
  try {
    const response = await eventsApi.searchMasterData(query, type);
    return getSearchItems(response as MasterDataSearchResponse | MasterDataItem[]);
  } catch {
    return [];
  }
};

const withSelectedItems = (
  items: MasterDataItem[],
  selectedIds: string[],
  selectedLabels: Record<string, string>,
) => {
  const itemMap = new Map(items.map((item) => [item.id, item]));

  selectedIds.forEach((id) => {
    if (id && !itemMap.has(id) && selectedLabels[id]) {
      itemMap.set(id, {
        id,
        value: selectedLabels[id],
      } as MasterDataItem);
    }
  });

  return Array.from(itemMap.values());
};

const toDropdownOptions = (items: MasterDataItem[]) =>
  items.map((item) => ({
    id: item.id,
    value: item.value,
  }));

const setSelectedLabels = (
  selectedIds: string[],
  options: { id: string; value: string }[],
  setLabels: Dispatch<SetStateAction<Record<string, string>>>,
) => {
  setLabels((current) => {
    const next = { ...current };
    selectedIds.forEach((id) => {
      const option = options.find((item) => item.id === id);
      if (option) next[id] = option.value;
    });
    return next;
  });
};

const resolveLocationLabel = (
  id: unknown,
  cityMap: Map<string, string>,
  stateMap: Map<string, string>,
  countryMap: Map<string, string>,
) => {
  if (!id) return '';
  const value = cityMap.get(String(id)) || stateMap.get(String(id)) || countryMap.get(String(id)) || '';
  return safeDisplayValue(value);
};

const toTableValue = (value: unknown) => safeDisplayValue(value) || '—';

const EventRegistrationsPage = () => {
  const navigate = useNavigate();
  const { employerId, eventId } = useParams<{ employerId?: string; eventId: string }>();
  const [pendingFilters, setPendingFilters] = useState<RegistrationFilters>(defaultFilters);
  const [filters, setFilters] = useState<RegistrationFilters>(defaultFilters);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [experienceResults, setExperienceResults] = useState<MasterDataItem[]>([]);
  const [educationResults, setEducationResults] = useState<MasterDataItem[]>([]);
  const [skillResults, setSkillResults] = useState<MasterDataItem[]>([]);
  const [experienceLabels, setExperienceLabels] = useState<Record<string, string>>({});
  const [educationLabels, setEducationLabels] = useState<Record<string, string>>({});
  const [skillLabels, setSkillLabels] = useState<Record<string, string>>({});
  const [specializationResults, setSpecializationResults] = useState<MasterDataItem[]>([]);
  const [specializationLabels, setSpecializationLabels] = useState<Record<string, string>>({});
  const limit = 100;

  const filterParams = useMemo(() => {
    const params: Record<string, unknown> = {};

    if (filters.country.length) {
      params.countryIds = filters.country;
    }

    if (filters.states.length) {
      params.stateIds = [...filters.states];
    }

    if (filters.cities.length) {
      params.cityIds = [...filters.cities];
    }

    if (filters.skills.length) {
      params.skillIds = [...filters.skills];
    }

    if (filters.experience.length) {
      params.experienceIds = [...filters.experience];
    }

    if (filters.education.length) {
      params.educationIds = [...filters.education];
    }

    if (filters.specialization.length) {
      params.specializationIds = [...filters.specialization];
    }

    if (filters.year.length) {
      params.yearOfPassing = filters.year;
    }

    params.search = filters.search?.trim() ?? '';
    params.page = page;
    params.limit = limit;

    return params;
  }, [filters, page, limit]);

  const { data: countries = [], isLoading: countriesLoading } = useQuery({
    queryKey: ['countries'],
    queryFn: eventsApi.getCountries,
    staleTime: 5 * 60 * 1000,
  });

  const { data: states = [], isLoading: statesLoading } = useQuery({
    queryKey: ['states', pendingFilters.country],
    queryFn: async () => {
      if (!pendingFilters.country.length) return [];

      const countrySlugs = pendingFilters.country
        .map((countryId) => countries.find((country) => country.id === countryId)?.slug)
        .filter((slug): slug is string => Boolean(slug));

      if (!countrySlugs.length) return [];

      const results = await Promise.all(
        countrySlugs.map((slug) => eventsApi.getStatesByCountrySlug(slug))
      );

      return results.flat();
    },
    enabled: pendingFilters.country.length > 0 && countries.length > 0,
    staleTime: 5 * 60 * 1000,
    keepPreviousData: true,
  });

  const { data: cities = [], isLoading: citiesLoading } = useQuery({
    queryKey: ['cities', pendingFilters.states],
    queryFn: async () => {
      if (!pendingFilters.states.length) return [];

      const allCities: MasterDataItem[] = [];
      for (const stateId of pendingFilters.states) {
        const state = states.find((item) => item.id === stateId);
        if (!state?.slug) continue;

        const stateCities = await eventsApi.getCitiesByStateSlug(state.slug);
        allCities.push(...stateCities);
      }

      return allCities;
    },
    enabled: pendingFilters.states.length > 0 && states.length > 0,
    staleTime: 5 * 60 * 1000,
    keepPreviousData: true,
  });

  const { data: skills = [], isLoading: skillsLoading } = useQuery({
    queryKey: ['skills'],
    queryFn: eventsApi.getSkills,
    staleTime: 5 * 60 * 1000,
  });

  const { data: hydratedExperienceLevels = [], isLoading: experienceLevelsLoading } = useQuery({
    queryKey: ['event-registration-experience-levels'],
    queryFn: eventsApi.getExperienceLevels,
    staleTime: 5 * 60 * 1000,
  });

  const { data: hydratedEducationLevels = [], isLoading: educationLevelsLoading } = useQuery({
    queryKey: ['event-registration-education-levels'],
    queryFn: eventsApi.getEducationLevels,
    staleTime: 5 * 60 * 1000,
  });

  const { data: employmentTypes = [], isLoading: employmentTypesLoading } = useQuery({
    queryKey: ['employment-types'],
    queryFn: eventsApi.getEmploymentTypes,
    staleTime: 5 * 60 * 1000,
  });

  const { data: allMasterData = [] } = useQuery({
    queryKey: ['all-master-data'],
    queryFn: eventsApi.getAllMasterData,
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: registrationsResponse,
    isLoading: registrationsLoading,
    isError,
  } = useQuery<EventRegistrationsResponse>({
    queryKey: ['event-registrations', eventId, JSON.stringify(filterParams), page],
    queryFn: () => eventsApi.getRegistrations(eventId ?? '', filterParams),
    enabled: Boolean(eventId),
    keepPreviousData: true,
  });

  type EventDetails = { id: string; title?: string };

  const { data: eventDetails, isLoading: eventLoading } = useQuery<EventDetails | undefined>({
    queryKey: ['event', eventId],
    queryFn: () => eventsApi.getById(eventId ?? ''),
    enabled: Boolean(eventId),
    staleTime: 5 * 60 * 1000,
  });

  const masterLoading =
    countriesLoading ||
    statesLoading ||
    citiesLoading ||
    skillsLoading ||
    employmentTypesLoading;

  const mappingLoading = experienceLevelsLoading || educationLevelsLoading;

  const allCountries = useMemo(
    () => allMasterData.filter((item) => item.type === 'LOCATION_COUNTRY'),
    [allMasterData],
  );

  const allStates = useMemo(
    () => allMasterData.filter((item) => item.type === 'LOCATION_STATE'),
    [allMasterData],
  );

  const allCities = useMemo(
    () => allMasterData.filter((item) => item.type === 'LOCATION_CITY'),
    [allMasterData],
  );

  const countryMap = useMemo(
    () => new Map(countries.map((item) => [item.id, item.value])),
    [countries],
  );

  const stateMap = useMemo(
    () => new Map(states.map((item) => [item.id, item.value])),
    [states],
  );

  const cityMap = useMemo(
    () => new Map(cities.map((item) => [item.id, item.value])),
    [cities],
  );

  const employmentTypeMap = useMemo(
    () => new Map(employmentTypes.map((item) => [item.id, item.value])),
    [employmentTypes],
  );

  const experienceLevelMap = useMemo(
    () => new Map([
      ...hydratedExperienceLevels.map((item) => [item.id, item.value] as const),
      ...experienceResults.map((item) => [item.id, item.value] as const),
      ...Object.entries(experienceLabels),
    ]),
    [experienceLabels, experienceResults, hydratedExperienceLevels],
  );

  const educationLevelMap = useMemo(
    () => new Map([
      ...hydratedEducationLevels.map((item) => [item.id, item.value] as const),
      ...educationResults.map((item) => [item.id, item.value] as const),
      ...Object.entries(educationLabels),
    ]),
    [educationLabels, educationResults, hydratedEducationLevels],
  );

  const allCountryMap = useMemo(
    () => new Map(allCountries.map((item) => [item.id, item.value])),
    [allCountries],
  );

  const allStateMap = useMemo(
    () => new Map(allStates.map((item) => [item.id, item.value])),
    [allStates],
  );

  const allCityMap = useMemo(
    () => new Map(allCities.map((item) => [item.id, item.value])),
    [allCities],
  );

  const filteredStates = useMemo(
    () => states.filter((state) => pendingFilters.country.length
      ? pendingFilters.country.includes(String(state.parentId || ''))
      : true),
    [states, pendingFilters.country],
  );

  const filteredCities = useMemo(
    () => cities.filter((city) => city.parentId !== null && pendingFilters.states.includes(city.parentId)),
    [cities, pendingFilters.states],
  );

  const years = useMemo(() => getYearOptions(), []);

  const skillMap = useMemo(
    () => new Map(skills.map((item) => [item.id, item.value])),
    [skills],
  );

  const handleExperienceSearch = useMemo(
    () => debounce(async (value: string) => {
      setExperienceResults(await searchMasterData(value, 'EXPERIENCE_LEVEL'));
    }, 300),
    [],
  );

  const handleEducationSearch = useMemo(
    () => debounce(async (value: string) => {
      setEducationResults(await searchMasterData(value, 'EDUCATION_LEVEL'));
    }, 300),
    [],
  );

  const handleSkillSearch = useMemo(
    () => debounce(async (value: string) => {
      setSkillResults(await searchMasterData(value, 'SKILL'));
    }, 300),
    [],
  );
  const handleSpecializationSearch = useMemo(
    () => debounce(async (value: string) => {
      const query = value?.trim().toLowerCase();
      if (!query || !pendingFilters.education.length) {
        setSpecializationResults([]);
        return;
      }

      try {
        const results = await Promise.all(
          pendingFilters.education.map((educationId) =>
            eventsApi.getSpecializationsByEducationId(educationId)
          )
        );

        const merged = results.flat() as MasterDataItem[];
        const deduped = Array.from(new Map(merged.map((item) => [item.id, item])).values());

        const filtered = deduped.filter((item) =>
          item.value?.toLowerCase().includes(query)
        );

        setSpecializationResults(filtered);
      } catch {
        setSpecializationResults([]);
      }
    }, 300),
    [pendingFilters.education],
  );

  const experienceOptions = useMemo(
    () => toDropdownOptions(withSelectedItems(
      experienceResults,
      pendingFilters.experience,
      experienceLabels,
    )),
    [experienceLabels, experienceResults, pendingFilters.experience],
  );

  const educationOptions = useMemo(
    () => toDropdownOptions(withSelectedItems(
      educationResults,
      pendingFilters.education,
      educationLabels,
    )),
    [educationLabels, educationResults, pendingFilters.education],
  );

  const skillOptions = useMemo(
    () => toDropdownOptions(withSelectedItems(
      skillResults,
      pendingFilters.skills,
      skillLabels,
    )),
    [skillLabels, skillResults, pendingFilters.skills],
  );
  const specializationOptions = useMemo(
    () => toDropdownOptions(withSelectedItems(
      specializationResults,
      pendingFilters.specialization,
      specializationLabels,
    )),
    [specializationLabels, specializationResults, pendingFilters.specialization],
  );
  if (!eventId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">Event ID is missing from the URL.</p>
          <Button
            className="mt-4"
            onClick={() =>
              navigate(
                employerId
                  ? `/employers/${employerId}`
                  : '/events'
              )
            }
          >
            Back to events
          </Button>
        </div>
      </div>
    );
  }

  const registrations = ((registrationsResponse as { registrations?: RegistrationRow[] } | undefined)?.registrations ?? []);

  const activeFiltersCount = [
    filters.country,
    filters.states,
    filters.cities,
    filters.skills,
    filters.experience,
    filters.education,
    filters.specialization,
    filters.year,
  ].filter((v) => v.length > 0).length;

  const handleApplyFilters = () => {
    setPage(1);
    setFilters({ ...pendingFilters });
  };

  const handleResetFilters = () => {
    setPage(1);
    setPendingFilters(defaultFilters);
    setFilters(defaultFilters);
    setSpecializationResults([]);
  };

  const handleExportCsv = async () => {
    if (!eventId) return;

    setExporting(true);

    try {
      const exportParams = { ...filterParams };
      delete exportParams.page;
      delete exportParams.limit;

      const response = await eventsApi.getRegistrations(eventId, exportParams);
      const rows = ((response as { registrations?: RegistrationRow[] })?.registrations ?? []);

      if (!rows.length) {
        toast.error('No registrations available to export.');
        return;
      }

      const csvRows = [
        [
          'Name',
          'Email',
          'Mobile',
          'Country',
          'State',
          'City',
          'Skills',
          'Degree',
          'HighestQualification',
          'Specialization',
          'University',
          'YearOfPassing',
          'EmploymentType',
          'WorkMode',
          'ShiftPreference',
          'JoiningDate',
          'PreferredLocations',
          'JobTitle',
          'CompanyName',
          'Years',
          'Months',
          'ExperienceLevel',
          'Status',
          'RegisteredAt',
        ],
        ...rows.map((registration) => {
          const user = (registration.user || {}) as AnyRecord;
          const profile = (user.profile || {}) as UserProfile & AnyRecord;
          const jobPref = (profile.jobPreferences || {}) as JobPreferences;

          const employmentType = jobPref?.employmentType
            ? safeDisplayValue(employmentTypeMap.get(jobPref.employmentType))
            : '';
          const workMode = safeDisplayValue(jobPref?.workMode);
          const shiftPreference = safeDisplayValue(jobPref?.shiftPreference);
          const joiningDate = safeDisplayValue(jobPref?.availableJoiningDate);

          const preferredLocations = Array.isArray(jobPref?.preferredLocationIds)
            ? jobPref.preferredLocationIds
                .map((id: string) => resolveLocationLabel(id, allCityMap, allStateMap, allCountryMap))
                .filter(Boolean)
                .join(', ')
            : '';

          const experienceList = Array.isArray(profile.experiences)
            ? (profile.experiences as ExperienceItem[])
            : [];

          const jobTitle = experienceList
            .map((exp) => safeDisplayValue(exp.jobTitle))
            .filter(Boolean)
            .join(', ');

          const companyName = experienceList
            .map((exp) => safeDisplayValue(exp.companyName))
            .filter(Boolean)
            .join(', ');

          const yearsValue = experienceList
            .map((exp) => exp.years ?? '')
            .filter((v) => v !== '')
            .join(', ');

          const monthsValue = experienceList
            .map((exp) => exp.months ?? '')
            .filter((v) => v !== '')
            .join(', ');
          const experienceLevel = profile.experienceLevelId
            ? safeDisplayValue(experienceLevelMap.get(profile.experienceLevelId))
            : '';
          const name = safeDisplayValue(user.fullName || registration.fullName);
          const email = safeDisplayValue(user.email || registration.email);
          const mobile = safeDisplayValue(user.mobile || user.phone || registration.mobile || registration.phone);
          const country = safeDisplayValue(allCountryMap.get(profile.countryId));
          const state = safeDisplayValue(allStateMap.get(profile.stateId));
          const city = safeDisplayValue(allCityMap.get(profile.currentCityId));
          const educationList = Array.isArray(profile.education)
            ? (profile.education as EducationItem[])
            : [];

          const degree = educationList
            .map((e) => safeDisplayValue(e.degreeName))
            .filter(Boolean)
            .join(', ');
          const qualificationsFromEducation = educationList
            .map((e): string => {
              if (e.highestQualificationId == null) return '';
              return safeDisplayValue(
                educationLevelMap.get(String(e.highestQualificationId)),
              );
            })
            .filter((q): q is string => Boolean(q));

          const seen = new Set<string>();
          const uniqueQualifications = qualificationsFromEducation.filter((q) => {
            if (seen.has(q)) return false;
            seen.add(q);
            return true;
          });

          const highestQualification =
            uniqueQualifications.length > 0
              ? uniqueQualifications.join(', ')
              // Legacy fallback: single highestQualificationId from profile root.
              : profile.highestQualificationId
                ? safeDisplayValue(educationLevelMap.get(profile.highestQualificationId))
                : '';

          const specialization = educationList
            .map((e) => safeDisplayValue(e.specialization))
            .filter(Boolean)
            .join(', ');

          const university = educationList
            .map((e) => safeDisplayValue(e.universityName))
            .filter(Boolean)
            .join(', ');

          const yearOfPassing = educationList
            .map((e) => safeDisplayValue(e.yearOfPassing))
            .filter(Boolean)
            .join(', ');
          const skillsValue = mapIdsToNames(profile.skills, skillMap);
          const status = safeDisplayValue(registration.status);
          const registeredAt = registration.registeredAt
            ? formatDateTime(registration.registeredAt)
            : '';

          return [
            escapeCsvValue(normalizeCsvValue(name)),
            escapeCsvValue(normalizeCsvValue(email)),
            escapeCsvValue(normalizeCsvValue(mobile)),
            escapeCsvValue(normalizeCsvValue(country)),
            escapeCsvValue(normalizeCsvValue(state)),
            escapeCsvValue(normalizeCsvValue(city)),
            escapeCsvValue(normalizeCsvValue(skillsValue)),
            escapeCsvValue(normalizeCsvValue(degree)),
            escapeCsvValue(normalizeCsvValue(highestQualification)),
            escapeCsvValue(normalizeCsvValue(specialization)),
            escapeCsvValue(normalizeCsvValue(university)),
            escapeCsvValue(normalizeCsvValue(yearOfPassing)),
            escapeCsvValue(normalizeCsvValue(employmentType)),
            escapeCsvValue(normalizeCsvValue(workMode)),
            escapeCsvValue(normalizeCsvValue(shiftPreference)),
            escapeCsvValue(normalizeCsvValue(joiningDate)),
            escapeCsvValue(normalizeCsvValue(preferredLocations)),
            escapeCsvValue(normalizeCsvValue(jobTitle)),
            escapeCsvValue(normalizeCsvValue(companyName)),
            escapeCsvValue(normalizeCsvValue(yearsValue)),
            escapeCsvValue(normalizeCsvValue(monthsValue)),
            escapeCsvValue(normalizeCsvValue(experienceLevel)),
            escapeCsvValue(normalizeCsvValue(status)),
            escapeCsvValue(normalizeCsvValue(registeredAt)),
          ];
        }),
      ];

      const csvContent = csvRows.map((row) => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `event-${eventId}-registrations.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Unable to export CSV. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const columns: Column<RegistrationRow>[] = [
    {
      key: 'name',
      header: 'Name',
      className: 'max-w-[160px] truncate',
      render: (registration) => {
        const name = toTableValue(registration.user?.fullName || registration.fullName);
        return (
          <div className="truncate">
            <div className="font-medium">{name}</div>
          </div>
        );
      },
    },
    {
      key: 'email',
      header: 'Email',
      className: 'max-w-[190px] truncate',
      render: (registration) => toTableValue(registration.user?.email || registration.email),
    },
    {
      key: 'mobile',
      header: 'Mobile',
      className: 'max-w-[140px] truncate',
      render: (registration) => {
        const row = registration as RegistrationRow;
        const user = (row.user || {}) as AnyRecord;
        return toTableValue(user?.mobile || user?.phone || row.mobile || row.phone);
      },
    },
    {
      key: 'skills',
      header: 'Skills',
      className: 'max-w-[170px] truncate',
      render: (registration) => {
        const row = registration as RegistrationRow;
        const profile = (((row.user || {}) as AnyRecord).profile || {}) as UserProfile;
        const skillNames = mapIdsToNames(profile.skills, skillMap) || '—';
        return <span className="truncate block">{skillNames}</span>;
      },
    },
    {
      key: 'education',
      header: 'Education',
      className: 'max-w-[150px] truncate',
      render: (registration) => {
        const profile = (((registration.user || {}) as AnyRecord).profile || {}) as UserProfile;
        const education = profile.highestQualificationId
          ? safeDisplayValue(educationLevelMap.get(profile.highestQualificationId))
          : '';
        return <span className="truncate block">{education || '—'}</span>;
      },
    },
    {
      key: 'specialization',
      header: 'Specialization',
      className: 'max-w-[200px] truncate',
      render: (registration) => {
        const profile = (((registration.user || {}) as AnyRecord).profile || {}) as UserProfile;

        const educationList = Array.isArray(profile.education)
          ? (profile.education as EducationItem[])
          : [];

        const specializations = educationList
          .map((e) => safeDisplayValue(e.specialization))
          .filter(Boolean)
          .join(', ');

        return (
          <span
            className="truncate block"
            title={specializations}
          >
            {specializations || '—'}
          </span>
        );
      },
    },
    {
      key: 'experience',
      header: 'Experience',
      className: 'max-w-[150px] truncate',
      render: (registration) => {
        const profile = (((registration.user || {}) as AnyRecord).profile || {}) as UserProfile;
        const experience = profile.experienceLevelId
          ? safeDisplayValue(experienceLevelMap.get(profile.experienceLevelId))
          : '';
        return <span className="truncate block">{experience || '—'}</span>;
      },
    },
    {
      key: 'location',
      header: 'Location',
      className: 'max-w-[180px] truncate',
      render: (registration) => {
        const profile = (((registration.user || {}) as AnyRecord).profile || {}) as UserProfile;

        const cityName = safeDisplayValue(allCityMap.get(profile.currentCityId));
        const stateName = safeDisplayValue(allStateMap.get(profile.stateId));
        const countryName = safeDisplayValue(allCountryMap.get(profile.countryId));

        const location = [cityName, stateName, countryName]
          .filter(Boolean)
          .join(', ') ||
          '—';
        return <span className="truncate block">{location}</span>;
      },
    },
    {
      key: 'registeredAt',
      header: 'Registered At',
      className: 'max-w-[160px] truncate',
      render: (registration) =>
        registration.registeredAt ? formatDateTime(registration.registeredAt) : '—',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex gap-4 lg:flex-cols-1 items-start justify-start">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            className="w-fit flex items-center gap-2 px-0 text-sm text-muted-foreground hover:text-foreground"
            onClick={() =>
              navigate(
                employerId
                  ? `/employers/${employerId}/events/${eventId}`
                  : '/events'
              )
            }
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-foreground">
            {eventLoading ? 'Loading...' : (eventDetails?.title || 'Event Registrations')}
          </h2>
          <p className="text-sm text-muted-foreground">
            Review registration details for this event.
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <FilterPanel
          activeCount={activeFiltersCount}
          onApply={handleApplyFilters}
          onReset={handleResetFilters}
          applyDisabled={masterLoading || registrationsLoading}
        >
          <div className="space-y-4">
            <MultiSelectDropdown
              label="Country"
              options={countries.map((c) => ({ id: c.id, value: c.value }))}
              selected={pendingFilters.country}
              onChange={(values) =>
                setPendingFilters((current) => ({
                  ...current,
                  country: values,
                  states: [],
                  cities: [],
                }))
              }
              placeholder="Select countries..."
              disabled={masterLoading}
              isLoading={countriesLoading}
            />

            <MultiSelectDropdown
              label="State"
              options={filteredStates.map((state) => ({
                id: state.id,
                value: state.value,
              }))}
              selected={pendingFilters.states}
              onChange={(values) =>
                setPendingFilters((current) => ({
                  ...current,
                  states: values,
                  cities: [],
                }))
              }
              disabled={masterLoading}
              isLoading={statesLoading}
              placeholder="Select states..."
            />

            <MultiSelectDropdown
              label="City"
              options={filteredCities.map((city) => ({
                id: city.id,
                value: city.value,
              }))}
              selected={pendingFilters.cities}
              onChange={(values) =>
                setPendingFilters((current) => ({
                  ...current,
                  cities: values,
                }))
              }
              disabled={masterLoading}
              isLoading={citiesLoading}
              placeholder="Select cities..."
            />
          
            <MultiSelectDropdown
              label="Skill"
              options={skillOptions}
              selected={pendingFilters.skills}
              onChange={(values) => {
                setSelectedLabels(values, skillOptions, setSkillLabels);

                setPendingFilters((current) => ({
                  ...current,
                  skills: values,
                }));
              }}
              disabled={masterLoading}
              placeholder="Type to search skills."
              onSearch={handleSkillSearch}
            />
          <MultiSelectDropdown
              label="Experience"
              options={experienceOptions}
              selected={pendingFilters.experience}
              onChange={(values) => {
                setSelectedLabels(values, experienceOptions, setExperienceLabels);
                setPendingFilters((current) => ({
                  ...current,
                  experience: values,
                }));
              }}
              disabled={masterLoading}
              placeholder="Type to search experience levels."
              onSearch={handleExperienceSearch}
            />

            <MultiSelectDropdown
              label="Education"
              options={educationOptions}
              selected={pendingFilters.education}
              onChange={(values) => {
                setSelectedLabels(values, educationOptions, setEducationLabels);
                setSpecializationResults([]);
                setPendingFilters((current) => ({
                  ...current,
                  education: values,
                  specialization: [],
                }));
              }}
              disabled={masterLoading}
              placeholder="Type to search qualifications."
              onSearch={handleEducationSearch}
            />
            <MultiSelectDropdown
              label="Specialization"
              options={specializationOptions}
              selected={pendingFilters.specialization}
              onChange={(values) => {
                setSelectedLabels(values, specializationOptions, setSpecializationLabels);
                setPendingFilters((current) => ({
                  ...current,
                  specialization: values,
                }));
              }}
              disabled={masterLoading || pendingFilters.education.length === 0}
              placeholder={
                pendingFilters.education.length
                  ? 'Type to search specializations.'
                  : 'Select education first'
              }
              onSearch={handleSpecializationSearch}
            />
            <MultiSelectDropdown
              label="Year of Passing"
              options={years}
              selected={pendingFilters.year}
              onChange={(values) =>
                setPendingFilters((current) => ({
                  ...current,
                  year: values,
                }))
              }
              placeholder="Select passing years..."
              disabled={masterLoading}
              isLoading={masterLoading}
            />
          </div>
        </FilterPanel>
      </div>

      <DataTable
        columns={columns}
        data={registrations}
        total={registrationsResponse?.total || 0}
        page={page}
        limit={limit}
        loading={registrationsLoading || masterLoading || mappingLoading}
        searchPlaceholder="Search by name or email"
        searchValue={pendingFilters.search}
        onSearchChange={(value) => {
          setPendingFilters((current) => ({ ...current, search: value }));

          if (value === '') {
            setFilters((current) => ({
              ...current,
              search: '',
            }));
            setPage(1);
          }
        }}
        onPageChange={(newPage) => setPage(newPage)}
        onSearchSubmit={handleApplyFilters}
        actions={(
          <Button
            variant="outline"
            onClick={handleExportCsv}
            disabled={exporting || registrations.length === 0}
          >
            {exporting ? 'Exporting...' : 'Download CSV'}
          </Button>
        )}
      />

      {isError && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          Unable to load registrations. Please try again.
        </div>
      )}
    </div>
  );
};

export default EventRegistrationsPage;
