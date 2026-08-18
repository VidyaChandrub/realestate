import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employersApi, jobsApi, masterDataApi, eventsApi } from '@/api/services';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getJobDescriptionText, sanitizeJobDescriptionHtml } from '@/lib/jobDescriptionHtml';
import {
  getEmployerMeOrganizations,
  persistJobOrganizations,
  persistSelectedJobOrganizationId,
  readStoredJobOrganizationId,
  resolveJobOrganizations,
  resolveSelectedJobOrganizationId,
  type EmployerMeData,
} from '@/lib/jobOrganizationSync';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { hasAdminRole } from '@/auth/roles';
import { JobForm } from '@/features/jobs/components/JobForm';
import type { Employer, Job } from '@/types';

// ── Constants ────────────────────────────────────────────────────────────────
interface MasterDataItem {
  id: string;
  type: string;
  value: string;
  slug: string;
  parentId?: string;
}

interface SelectOption {
  label: string;
  value: string;
  parentId?: string | null;
}

interface MasterDataOption {
  id: string;
  value: string;
  slug?: string;
  parentId?: string | null;
}

interface JobTagPayload {
  tagType?: string;
  type?: string;
  tagValue?: string;
  tagName?: string;
  skillName?: string;
  value?: string;
  name?: string;
  label?: string;
  masterData?: unknown;
  masterDataId?: string;
  id?: string;
}

interface MasterDataSearchResponse {
  items?: MasterDataItem[];
  data?: {
    items?: MasterDataItem[];
  } | MasterDataItem[];
}

interface ApiErrorResponse {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
}

function toOptions(items: MasterDataItem[] = []): SelectOption[] {
  return items.map((item) => ({
    label: item.value,
    value: item.id,
    parentId: item.parentId,
  }));
}

function readMasterDataId(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && 'id' in value) {
    const id = (value as { id?: unknown }).id;
    return typeof id === 'string' ? id : '';
  }
  return '';
}

function readMasterDataLabel(value: unknown): string {
  if (!value || typeof value !== 'object') return '';
  const item = value as { value?: unknown; name?: unknown; label?: unknown; title?: unknown };
  const label = item.value || item.name || item.label || item.title;
  return typeof label === 'string' ? label : '';
}

function isUuidString(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89abAB][0-9a-f]{3}-[0-9a-f]{12}$/.test(value);
}

function getReadableLabel(value: unknown, fallbackId?: string): string {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed || trimmed === fallbackId || isUuidString(trimmed)) return '';
  return trimmed;
}

function readJobName(job: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = job[key];
    if (typeof value === 'string') {
      const readable = getReadableLabel(value);
      if (readable) return readable;
    }
    const label = readMasterDataLabel(value);
    if (label) return label;
  }
  return '';
}

function withSelectedOption(options: SelectOption[], value: string, label?: string) {
  if (!value || options.some((option) => option.value === value)) return options;
  return label ? [{ value, label }, ...options] : options;
}

function withSelectedOptions(
  options: SelectOption[],
  values: string[],
  labels: Record<string, string> = {}
) {
  const optionMap = new Map(options.map((option) => [option.value, option]));
  values.forEach((value) => {
    const readableLabel = labels[value];

    if (value && !optionMap.has(value) && readableLabel) {
      optionMap.set(value, {
        value,
        label: readableLabel,
      });
    }
  });
  return Array.from(optionMap.values());
}

function toDropdownOptions(options: SelectOption[]) {
  return options.map((option) => ({
    id: option.value,
    value: option.label,
  }));
}

function getSearchItems(response: MasterDataSearchResponse | MasterDataItem[]): MasterDataItem[] {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.items)) return response.data.items;
  return [];
}

function debounce<T extends (...args: string[]) => void>(fn: T, delay: number) {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

async function searchMasterData(value: string, type: string): Promise<MasterDataItem[]> {
  const query = value?.trim();
  if (!query) return [];
  try {
    const response = await masterDataApi.search({ value: query, type });
    return getSearchItems(response as MasterDataSearchResponse | MasterDataItem[]);
  } catch {
    return [];
  }
}

/**
 * Normalize extracted skill IDs by converting labels to UUIDs using skillOptions.
 * If a skill ID is not a valid UUID format, try to find it by matching against skillOptions labels.
 */
function normalizeSkillIds(extractedIds: string[], skillOptions: SelectOption[]): string[] {
  if (skillOptions.length === 0) {
    return extractedIds;
  }

  const labelToIdMap = new Map<string, string>();
  skillOptions.forEach((option) => {
    labelToIdMap.set(option.label.toLowerCase(), option.value);
  });

  return extractedIds
    .map((id) => {
      if (skillOptions.some((opt) => opt.value === id)) {
        return id;
      }

      const normalizedLabel = id.toLowerCase();
      const matchedUuid = labelToIdMap.get(normalizedLabel);
      if (matchedUuid) {
        return matchedUuid;
      }

      return id;
    })
    .filter(Boolean);
}

function extractSkillTags(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value.flatMap((tag) => {
    const item = tag as JobTagPayload & { values?: string[]; labels?: string[] };
    const type = item.type || item.tagType || 'SKILL';
    if (type !== 'SKILL') return [];

    if (Array.isArray(item.values)) {
      return item.values.map((id, index) => ({
        id,
        label: getReadableLabel(item.labels?.[index] || '', id),
      }));
    }

    const id = item.masterDataId || item.id || item.tagValue || (typeof item.value === 'string' ? item.value : '');
    if (!id) return [];

    const label =
      getReadableLabel(item.skillName, id) ||
      getReadableLabel(item.tagName, id) ||
      getReadableLabel(readMasterDataLabel(item.masterData), id) ||
      getReadableLabel(typeof item.value === 'string' ? item.value : undefined, id) ||
      getReadableLabel(item.name, id) ||
      getReadableLabel(item.label, id);

    return [{
      id,
      label,
    }];
  });
}

function extractEducationQualifications(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item === 'string') {
        return { id: item, label: item };
      }

      if (!item || typeof item !== 'object') {
        return null;
      }

      const qualification = item as {
        id?: unknown;
        masterDataId?: unknown;
        educationLevelId?: unknown;
        value?: unknown;
        name?: unknown;
        label?: unknown;
        masterData?: unknown;
      };
      const id =
        (typeof qualification.masterDataId === 'string' && qualification.masterDataId) ||
        (typeof qualification.educationLevelId === 'string' && qualification.educationLevelId) ||
        readMasterDataId(qualification.masterData) ||
        (typeof qualification.id === 'string' && qualification.id) ||
        '';
      const label =
        getReadableLabel(readMasterDataLabel(qualification.masterData), id) ||
        getReadableLabel(typeof qualification.value === 'string' ? qualification.value : undefined, id) ||
        getReadableLabel(typeof qualification.name === 'string' ? qualification.name : undefined, id) ||
        getReadableLabel(typeof qualification.label === 'string' ? qualification.label : undefined, id);

      return id ? { id, label } : null;
    })
    .filter((item): item is { id: string; label: string } => Boolean(item));
}

function extractSpecializations(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item === 'string') {
        return { id: item, label: item };
      }

      if (!item || typeof item !== 'object') {
        return null;
      }

      const spec = item as {
        id?: unknown;
        masterDataId?: unknown;
        specializationId?: unknown;
        value?: unknown;
        name?: unknown;
        label?: unknown;
        masterData?: unknown;
      };
      const id =
        (typeof spec.masterDataId === 'string' && spec.masterDataId) ||
        (typeof spec.specializationId === 'string' && spec.specializationId) ||
        readMasterDataId(spec.masterData) ||
        (typeof spec.id === 'string' && spec.id) ||
        '';
      const label =
        getReadableLabel(readMasterDataLabel(spec.masterData), id) ||
        getReadableLabel(typeof spec.value === 'string' ? spec.value : undefined, id) ||
        getReadableLabel(typeof spec.name === 'string' ? spec.name : undefined, id) ||
        getReadableLabel(typeof spec.label === 'string' ? spec.label : undefined, id);

      return id ? { id, label } : null;
    })
    .filter((item): item is { id: string; label: string } => Boolean(item));
}

export default function JobFormPage() {
  const { id, employerId } = useParams<{ id?: string; employerId?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const editPopulatedRef = useRef(false);
  const isEdit = !!id;
  const userRoles = useAuthStore((s) => s.user?.roles ?? []);
  const token = useAuthStore((s) => s.token);
  const isAdmin = hasAdminRole(userRoles);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(() => employerId ?? readStoredJobOrganizationId());
  const [requestedMasterTypes, setRequestedMasterTypes] = useState<Set<string>>(() => new Set());
  const requestMasterType = (type: string) => {
    setRequestedMasterTypes((current) => {
      if (current.has(type)) return current;
      const next = new Set(current);
      next.add(type);
      return next;
    });
  };

  const { data: meData } = useQuery<EmployerMeData>({
    queryKey: ['employer-me'],
    queryFn: employersApi.getMe,
    enabled: !isEdit,
  });

  const {
    data: fallbackOrganizations = [],
    isLoading: fallbackOrganizationsLoading,
  } = useQuery<Employer[]>(
    {
      queryKey: ['my-organizations', isAdmin],
      queryFn: async () => {
        if (isAdmin) {
          const response = await employersApi.list({ page: 1, limit: 1000 });
          return response.data;
        }

        return employersApi.listMine();
      },
      enabled: !!token && !employerId,
    }
  );

  // ── Fetch employer details when employerId exists (for display only) ──────────
  const { data: scopedEmployer } = useQuery({
    queryKey: ['employer', employerId],
    queryFn: () => employersApi.getOne(employerId!),
    enabled: Boolean(employerId),
  });

  const organizations = useMemo(
    () => (employerId ? [] : resolveJobOrganizations(meData, fallbackOrganizations)),
    [employerId, meData, fallbackOrganizations]
  );

  const organizationsLoading = !employerId && (fallbackOrganizationsLoading || (!isAdmin && !meData));

  useEffect(() => {
    if (employerId) {
      setSelectedOrganizationId(employerId);
      return;
    }

    if (isEdit || organizationsLoading) return;

    persistJobOrganizations(organizations);

    if (organizations.length === 0) {
      setSelectedOrganizationId(null);
      persistSelectedJobOrganizationId(null);
      return;
    }

    const nextOrganizationId = resolveSelectedJobOrganizationId({
      meData,
      organizations,
      storedOrganizationId: readStoredJobOrganizationId(),
    });

    if (selectedOrganizationId !== nextOrganizationId) {
      setSelectedOrganizationId(nextOrganizationId);
    }

    persistSelectedJobOrganizationId(nextOrganizationId);
  }, [employerId, isEdit, meData, organizations, organizationsLoading, selectedOrganizationId]);

  // ── Master data ──────────────────────────────────────────────────────────
  const masterDataQueryOptions = {
    staleTime: 20 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  };

  const citiesQuery = useQuery({
    queryKey: ['master-data', 'by-type', 'LOCATION_CITY'],
    queryFn: () => masterDataApi.getByType('LOCATION_CITY'),
    enabled: requestedMasterTypes.has('LOCATION_CITY'),
    ...masterDataQueryOptions,
  });
  const experienceLevelsQuery = useQuery({
    queryKey: ['master-data', 'by-type', 'EXPERIENCE_LEVEL'],
    queryFn: () => masterDataApi.getByType('EXPERIENCE_LEVEL'),
    enabled: requestedMasterTypes.has('EXPERIENCE_LEVEL'),
    ...masterDataQueryOptions,
  });
  const educationLevelsQuery = useQuery({
    queryKey: ['master-data', 'by-type', 'EDUCATION_LEVEL'],
    queryFn: () => masterDataApi.getByType('EDUCATION_LEVEL'),
    enabled: requestedMasterTypes.has('EDUCATION_LEVEL'),
    ...masterDataQueryOptions,
  });
  const employmentTypesQuery = useQuery({
    queryKey: ['master-data', 'by-type', 'EMPLOYMENT_TYPE'],
    queryFn: () => masterDataApi.getByType('EMPLOYMENT_TYPE'),
    enabled: requestedMasterTypes.has('EMPLOYMENT_TYPE'),
    ...masterDataQueryOptions,
  });
  const skillsQuery = useQuery({
    queryKey: ['master-data', 'by-type', 'SKILL'],
    queryFn: () => masterDataApi.getByType('SKILL'),
    enabled: requestedMasterTypes.has('SKILL'),
    ...masterDataQueryOptions,
  });

  useEffect(() => {
    requestMasterType('EMPLOYMENT_TYPE');
  }, []);

  const cityOptions = useMemo(() => toOptions(citiesQuery.data as MasterDataItem[]), [citiesQuery.data]);
  const experienceLevelOptions = useMemo(() => toOptions(experienceLevelsQuery.data as MasterDataItem[]), [experienceLevelsQuery.data]);
  const educationLevelOptions = useMemo(() => toOptions(educationLevelsQuery.data as MasterDataItem[]), [educationLevelsQuery.data]);
  const employmentTypeOptions = useMemo(() => toOptions(employmentTypesQuery.data as MasterDataItem[]), [employmentTypesQuery.data]);
  const skillOptions = useMemo(() => toOptions(skillsQuery.data as MasterDataItem[]), [skillsQuery.data]);

  const masterDataError =
    citiesQuery.isError ||
    experienceLevelsQuery.isError ||
    educationLevelsQuery.isError ||
    employmentTypesQuery.isError ||
    skillsQuery.isError;
  useEffect(() => {
    if (masterDataError) {
      toast.error('Failed to load master data options');
    }
  }, [masterDataError]);

  // ── Existing job (edit mode) ─────────────────────────────────────────────
  const { data: jobData, isLoading: jobLoading } = useQuery({
    queryKey: ['job', id],
    queryFn: () => jobsApi.getOne(id!),
    enabled: isEdit,
  });

  const jobDataOrganization = (jobData as Job)?.organization ?? null;
  const currentOrganizationId = isEdit
    ? jobDataOrganization?.id || selectedOrganizationId
    : selectedOrganizationId;
  const selectedOrganization =
    organizations.find((organization) => organization.id === currentOrganizationId) ??
    jobDataOrganization ??
    null;

  // ── Fallback display for employer-scoped routes ─────────────────────────────────
  const selectedOrganizationDisplay =
    selectedOrganization ??
    (scopedEmployer
      ? {
          id: scopedEmployer.id,
          name: scopedEmployer.name,
        }
      : null);

  // Request key master data immediately for edit mode to enable normalization
  useEffect(() => {
    if (isEdit) {
      requestMasterType('SKILL');
      requestMasterType('EDUCATION_LEVEL');
    }
  }, [isEdit]);

  // ── Form state ────────────────────────────────────────────────────────────
  const [jobType, setJobType] = useState<'EXTERNAL' | 'INTERNAL'>('INTERNAL');
  const [form, setForm] = useState({
    title: '', summary: '', description: '',
    city: '', experienceLevel: '', educationLevel: '',
    salaryMin: '', salaryMax: '', employmentType: '',
    backgroundImageUrl: '', externalUrl: '',
  });
  const [selectedLabels, setSelectedLabels] = useState({
    city: '',
    experienceLevel: '',
    educationLevel: '',
    employmentType: '',
  });
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [selectedEducationIds, setSelectedEducationIds] = useState<string[]>([]);
  const [selectedSkillLabels, setSelectedSkillLabels] = useState<Record<string, string>>({});
  const [selectedEducationLabels, setSelectedEducationLabels] = useState<Record<string, string>>({});
  const [selectedSpecializationIds, setSelectedSpecializationIds] = useState<string[]>([]);
  const [selectedSpecializationLabels, setSelectedSpecializationLabels] = useState<Record<string, string>>({});
  const [searchCityOptions, setSearchCityOptions] = useState<MasterDataItem[]>([]);
  const [searchExperienceOptions, setSearchExperienceOptions] = useState<MasterDataItem[]>([]);
  const [searchEducationOptions, setSearchEducationOptions] = useState<MasterDataItem[]>([]);
  const [searchEmploymentOptions, setSearchEmploymentOptions] = useState<MasterDataItem[]>([]);
  const [searchSkillOptions, setSearchSkillOptions] = useState<MasterDataItem[]>([]);
  const [searchSpecializationOptions, setSearchSpecializationOptions] = useState<MasterDataItem[]>([]);
  const [selectedSpecializationOptions, setSelectedSpecializationOptions] = useState<MasterDataOption[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<'draft' | 'publish' | null>(null);

  const handleCitySearch = useMemo(
    () => debounce(async (value: string) => setSearchCityOptions(await searchMasterData(value, 'LOCATION_CITY')), 300),
    []
  );
  const handleExperienceSearch = useMemo(
    () => debounce(async (value: string) => setSearchExperienceOptions(await searchMasterData(value, 'EXPERIENCE_LEVEL')), 300),
    []
  );
  const handleEducationSearch = useMemo(
    () => debounce(async (value: string) => setSearchEducationOptions(await searchMasterData(value, 'EDUCATION_LEVEL')), 300),
    []
  );
  const handleEmploymentSearch = useMemo(
    () => debounce(async (value: string) => setSearchEmploymentOptions(await searchMasterData(value, 'EMPLOYMENT_TYPE')), 300),
    []
  );
  const handleSkillSearch = useMemo(
    () => debounce(async (value: string) => setSearchSkillOptions(await searchMasterData(value, 'SKILL')), 300),
    []
  );

  const handleSpecializationSearch = useMemo(
    () => debounce(async (value: string) => setSearchSpecializationOptions(await searchMasterData(value, 'SPECIALIZATION')), 300),
    []
  );

  const { data: specializationsByEducationData = [] } = useQuery({
    queryKey: ['specializations-by-education', selectedEducationIds],
    queryFn: async () => {
      if (selectedEducationIds.length === 0) {
        return [];
      }
      try {
        const results = await Promise.all(
          selectedEducationIds.map((educationId) =>
            eventsApi.getSpecializationsByEducationId(educationId)
          )
        );
        return results.flat() as MasterDataItem[];
      } catch {
        return [];
      }
    },
    enabled: selectedEducationIds.length > 0,
    staleTime: 20 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const baseCityOptions = useMemo(() => toOptions(searchCityOptions), [searchCityOptions]);
  const baseExperienceLevelOptions = useMemo(() => toOptions(searchExperienceOptions), [searchExperienceOptions]);
  const baseEducationLevelOptions = useMemo(() => toOptions(searchEducationOptions), [searchEducationOptions]);
  const baseEmploymentTypeOptions = useMemo(
    () => (searchEmploymentOptions.length > 0 ? toOptions(searchEmploymentOptions) : employmentTypeOptions),
    [searchEmploymentOptions, employmentTypeOptions]
  );
  const baseSkillOptions = useMemo(() => toOptions(searchSkillOptions), [searchSkillOptions]);

  const baseSpecializationOptions = useMemo(() => {
    return [];
  }, []);

  const isCitySearchActive = searchCityOptions.length > 0;
  const isExperienceSearchActive = searchExperienceOptions.length > 0;
  const isEducationSearchActive = searchEducationOptions.length > 0;
  const isEmploymentSearchActive = searchEmploymentOptions.length > 0;
  const isSkillSearchActive = searchSkillOptions.length > 0;
  const isSpecializationSearchActive = searchSpecializationOptions.length > 0;

  const displayCityOptions = useMemo(
    () =>
      withSelectedOption(baseCityOptions, form.city, selectedLabels.city),
    [baseCityOptions, form.city, selectedLabels.city]
  );
  const displayExperienceLevelOptions = useMemo(
    () =>
      withSelectedOption(baseExperienceLevelOptions, form.experienceLevel, selectedLabels.experienceLevel),
    [baseExperienceLevelOptions, form.experienceLevel, selectedLabels.experienceLevel]
  );
  const displayEducationLevelOptions = useMemo(
    () => {
      if (isEducationSearchActive) {
        return baseEducationLevelOptions;
      }

      return withSelectedOptions(
        withSelectedOption(baseEducationLevelOptions, form.educationLevel, selectedLabels.educationLevel),
        selectedEducationIds,
        selectedEducationLabels
      );
    },
    [
      baseEducationLevelOptions,
      form.educationLevel,
      isEducationSearchActive,
      selectedEducationIds,
      selectedEducationLabels,
      selectedLabels.educationLevel,
    ]
  );
  const displayEmploymentTypeOptions = useMemo(
    () =>
      isEmploymentSearchActive
        ? baseEmploymentTypeOptions
        : withSelectedOption(baseEmploymentTypeOptions, form.employmentType, selectedLabels.employmentType),
    [baseEmploymentTypeOptions, form.employmentType, isEmploymentSearchActive, selectedLabels.employmentType]
  );
  const displaySkillOptions = useMemo(() => {
    const options = isSkillSearchActive
      ? baseSkillOptions
      : withSelectedOptions(baseSkillOptions, selectedSkillIds, selectedSkillLabels);

    return toDropdownOptions(options);
  }, [baseSkillOptions, isSkillSearchActive, selectedSkillIds, selectedSkillLabels]);

  const displaySpecializationOptions = useMemo(() => {
    const searchResults = (searchSpecializationOptions as MasterDataItem[])
      .filter((item) => !item.parentId || selectedEducationIds.includes(item.parentId))
      .map((item) => ({
        label: item.value,
        value: item.id,
        parentId: item.parentId,
      }));
    const options = withSelectedOptions(searchResults, selectedSpecializationIds, selectedSpecializationLabels);
    return toDropdownOptions(options);
  }, [isSpecializationSearchActive, selectedSpecializationIds, selectedSpecializationLabels, searchSpecializationOptions, selectedEducationIds]);

  const searchableCityOptions = useMemo(() => toDropdownOptions(displayCityOptions), [displayCityOptions]);
  const searchableExperienceLevelOptions = useMemo(
    () => toDropdownOptions(displayExperienceLevelOptions),
    [displayExperienceLevelOptions]
  );
  const searchableEducationLevelOptions = useMemo(
    () => toDropdownOptions(displayEducationLevelOptions),
    [displayEducationLevelOptions]
  );
  const searchableEmploymentTypeOptions = useMemo(
    () => toDropdownOptions(displayEmploymentTypeOptions),
    [displayEmploymentTypeOptions]
  );

  // Populate form in edit mode
  useEffect(() => {
    if (isEdit && jobData) {
      const job = (jobData?.data || jobData) as Record<string, unknown>;
      const cityId = readMasterDataId(job.cityId) || readMasterDataId(job.locationId);
      const experienceLevelId = readMasterDataId(job.experienceLevelId);
      const educationLevelId = readMasterDataId(job.educationLevelId);
      const employmentTypeId = readMasterDataId(job.employmentTypeId);
      const labels = {
        city: readJobName(job, ['city', 'cityName', 'city_name', 'location', 'locationName', 'location_name', 'cityId', 'locationId']),
        experienceLevel: readJobName(job, ['experienceLevel', 'experienceLevelName', 'experience_level_name', 'experienceLevelId']),
        educationLevel: readJobName(job, ['educationLevel', 'educationLevelName', 'education_level_name', 'educationLevelId']),
        employmentType: readJobName(job, ['employmentType', 'employmentTypeName', 'employment_type_name', 'employmentTypeId']),
      };
      const educationLabels: Record<string, string> = {};
      const educationLabelToIdMap = new Map(
        educationLevelOptions.map((option) => [option.label.toLowerCase(), option.value])
      );
      const qualificationItems = extractEducationQualifications(job.educationQualifications);
      let educationIds =
        qualificationItems.length > 0
          ? qualificationItems.map((qualification) => {
              const matchedId = educationLevelOptions.some((option) => option.value === qualification.id)
                ? qualification.id
                : educationLabelToIdMap.get(qualification.label.toLowerCase()) || qualification.id;
              if (qualification.label) {
                educationLabels[matchedId] = qualification.label;
              }
              return matchedId;
            })
          : educationLevelId
            ? [educationLevelId]
            : [];

      if (educationLevelId && !educationIds.includes(educationLevelId)) {
        educationIds = [educationLevelId, ...educationIds];
      }
      if (educationLevelId && labels.educationLevel) {
        educationLabels[educationLevelId] = labels.educationLevel;
      }
      educationIds = Array.from(new Set(educationIds.filter(Boolean)));
      educationIds.forEach((educationId) => {
        const optionLabel = educationLevelOptions.find((option) => option.value === educationId)?.label;
        if (!educationLabels[educationId] && optionLabel && !isUuidString(optionLabel)) {
          educationLabels[educationId] = optionLabel;
        }
      });

      const skillLabels: Record<string, string> = {};
      // Extract skills from multiple possible sources
      let skillIds: string[] = [];
      
      // Try extracting from tags first
      const tagsSkills = extractSkillTags(job.tags);
      if (tagsSkills.length > 0) {
        skillIds = tagsSkills.map((tag) => {
          if (tag.label) {
            skillLabels[tag.id] = tag.label;
          }
          return tag.id;
        });
      } else if (Array.isArray(job.skills)) {
        // If no skills in tags, try direct skills array
        skillIds = job.skills.map((skill) => {
          if (typeof skill === 'string') {
            const readableSkill = getReadableLabel(skill, skill);
            if (readableSkill) {
              skillLabels[skill] = readableSkill;
            }
            return skill;
          }
          if (!skill || typeof skill !== 'object') return '';

          const skillItem = skill as {
            masterDataId?: unknown;
            id?: unknown;
            masterData?: unknown;
            value?: unknown;
            name?: unknown;
            label?: unknown;
          };
          const skillId =
            (typeof skillItem.masterDataId === 'string' && skillItem.masterDataId) ||
            (typeof skillItem.id === 'string' && skillItem.id) ||
            '';
          const skillLabel =
            getReadableLabel(readMasterDataLabel(skillItem.masterData), skillId) ||
            getReadableLabel(typeof skillItem.value === 'string' ? skillItem.value : undefined, skillId) ||
            getReadableLabel(typeof skillItem.name === 'string' ? skillItem.name : undefined, skillId) ||
            getReadableLabel(typeof skillItem.label === 'string' ? skillItem.label : undefined, skillId);
          if (skillId && skillLabel) skillLabels[skillId] = skillLabel;
          return skillId;
        }).filter(Boolean);
      }
      skillIds = Array.from(new Set(skillIds));
      
      // Normalize skill IDs: convert any labels to UUIDs using skillOptions
      const normalizedSkillIds = skillOptions.length > 0 ? normalizeSkillIds(skillIds, skillOptions) : skillIds;
      normalizedSkillIds.forEach((skillId) => {
        const optionLabel = skillOptions.find((option) => option.value === skillId)?.label;
        if (!skillLabels[skillId] && optionLabel && !isUuidString(optionLabel)) {
          skillLabels[skillId] = optionLabel;
        }
      });

      Object.keys(skillLabels).forEach((key) => {
        if (!skillLabels[key] || isUuidString(skillLabels[key])) {
          delete skillLabels[key];
        }
      });

      Object.keys(educationLabels).forEach((key) => {
        if (!educationLabels[key] || isUuidString(educationLabels[key])) {
          delete educationLabels[key];
        }
      });

      setJobType(job.jobType === 'EXTERNAL' ? 'EXTERNAL' : 'INTERNAL');
      setForm({
        title:              typeof job.title === 'string' ? job.title : '',
        summary:            typeof job.summary === 'string' ? job.summary : '',
        description:        typeof job.description === 'string' ? job.description : '',
        city:               cityId,
        experienceLevel:    experienceLevelId,
        educationLevel:     educationLevelId,
        salaryMin:          job.salaryMin?.toString() || '',
        salaryMax:          job.salaryMax?.toString() || '',
        employmentType:     employmentTypeId,
        backgroundImageUrl: typeof job.backgroundImage === 'string' ? job.backgroundImage : typeof job.imageUrl === 'string' ? job.imageUrl : '',
        externalUrl:        typeof job.externalUrl === 'string' ? job.externalUrl : '',
      });
      setSelectedLabels(labels);
      setSelectedEducationIds(educationIds);
      setSelectedEducationLabels(educationLabels);
      setSelectedSkillIds(normalizedSkillIds);
      setSelectedSkillLabels(skillLabels);
      setImagePreview(typeof job.backgroundImage === 'string' ? job.backgroundImage : typeof job.imageUrl === 'string' ? job.imageUrl : null);
      editPopulatedRef.current = true;
    }
  }, [isEdit, jobData, skillOptions, educationLevelOptions]);

  // ── Load specializations based on selected education IDs ──────────────────
  useEffect(() => {
    if (!selectedEducationIds.length) {
      setSelectedSpecializationIds([]);
      setSelectedSpecializationOptions([]);
      return;
    }

    // Only pre-fill on edit, and only once
    if (!isEdit || !jobData) return;
    if (selectedSpecializationIds.length > 0) return;

    // Wait until the edit form has been populated before restoring
    // specializations — editPopulatedRef ensures education IDs are final
    if (!editPopulatedRef.current) return;

    let isCurrent = true;

    const restoreSpecializations = async () => {
      try {
        const job = jobData?.data || jobData;
        const specializationItems = extractSpecializations(job.specializations);

        if (!isCurrent) return;

        if (specializationItems.length) {
          const specializationIds = specializationItems.map((spec) => spec.id);
          const specializationLabels: Record<string, string> = {};
          specializationItems.forEach((spec) => {
            if (spec.label) {
              specializationLabels[spec.id] = spec.label;
            }
          });
          setSelectedSpecializationIds(specializationIds);
          setSelectedSpecializationLabels(specializationLabels);
          setSelectedSpecializationOptions(
            specializationItems.map((item) => ({
              id: item.id,
              value: item.label,
              parentId: undefined,
            }))
          );
        }
      } catch (error) {
        console.error('Failed to restore specializations', error);
      }
    };

    restoreSpecializations();

    return () => {
      isCurrent = false;
    };
  }, [selectedEducationIds, isEdit, jobData, selectedSpecializationIds.length]);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & Record<string, unknown>) =>
      jobsApi.update(id, payload),
  });

  const publishMutation = useMutation({
    mutationFn: (jobId: string) => jobsApi.publish(jobId),
  });

  const isAnyMutationPending = updateMutation.isPending || publishMutation.isPending;

  // ── Helpers ───────────────────────────────────────────────────────────────
  const buildPayload = (): Record<string, unknown> => {
    const description = sanitizeJobDescriptionHtml(form.description);
    const payload: Record<string, unknown> = {
      title:            form.title,
      summary:          form.summary || undefined,
      description,
      status:           'DRAFT',
      jobType,
      externalUrl:      jobType === 'EXTERNAL' && form.externalUrl?.trim() ? form.externalUrl.trim() : undefined,
      salaryMin:        form.salaryMin ? Number(form.salaryMin) : undefined,
      salaryMax:        form.salaryMax ? Number(form.salaryMax) : undefined,
      locationId:        form.city || undefined,
      experienceLevelId: form.experienceLevel || undefined,
      employmentTypeId:  form.employmentType || undefined,
      backgroundImage:   form.backgroundImageUrl?.trim() || 'https://images.unsplash.com/photo-1497366216548-37526070297c',
    };

    const skillTagIds = Array.from(new Set(selectedSkillIds.filter(Boolean)));
    if (skillTagIds.length > 0) {
      payload.skills = skillTagIds.map((id) => ({ masterDataId: id }));
    }

    const educationIds = Array.from(new Set(selectedEducationIds.filter(Boolean)));
    if (educationIds.length > 0) {
      payload.educationQualifications = educationIds.map((id) => ({
        masterDataId: id,
      }));
    } else if (form.educationLevel) {
      payload.educationLevelId = form.educationLevel;
    }

    const specializationIds = Array.from(new Set(selectedSpecializationIds.filter(Boolean)));
    payload.specializationIds = specializationIds;

    return payload;
  };

  const handleSave = async (publish: boolean) => {
    if (!selectedOrganizationId) { toast.error('Select an organization before saving the job.'); return; }
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    if (!jobType) { toast.error('Job type is required'); return; }
    if (!form.city) { toast.error('Work location is required'); return; }
    if (!form.experienceLevel) { toast.error('Experience level is required'); return; }
    if (selectedEducationIds.length === 0 && !form.educationLevel) { toast.error('Education qualification is required'); return; }
    if (selectedSkillIds.length === 0) { toast.error('At least one skill is required'); return; }
    if (!getJobDescriptionText(form.description)) { toast.error('Description is required'); return; }

    const action = publish ? 'publish' : 'draft';
    setActiveAction(action);

    try {
      const payload = buildPayload();

      await updateMutation.mutateAsync({ id: id!, ...payload });
      if (publish) await publishMutation.mutateAsync(id!);

      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      if (id) {
        queryClient.invalidateQueries({ queryKey: ['job', id] });
      }
      toast.success(publish ? 'Job updated and published!' : 'Job updated!');
      navigate(employerId ? `/employers/${employerId}` : `/jobs/${id}`);
    } catch (err: unknown) {
      const error = err as ApiErrorResponse;
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        'Failed to publish job';
      toast.error(errorMessage);
    } finally {
      setActiveAction(null);
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isEdit && jobLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <JobForm
      isEdit={isEdit}
      employerId={employerId}
      selectedOrganizationId={selectedOrganizationId}
      selectedOrganization={selectedOrganizationDisplay}
      organizations={organizations}
      organizationLoading={organizationsLoading}
      onOrganizationChange={setSelectedOrganizationId}
      jobType={jobType}
      setJobType={setJobType}
      form={form}
      setForm={setForm}
      selectedSkillIds={selectedSkillIds}
      setSelectedSkillIds={setSelectedSkillIds}
      selectedEducationIds={selectedEducationIds}
      setSelectedEducationIds={setSelectedEducationIds}
      selectedSkillLabels={selectedSkillLabels}
      setSelectedSkillLabels={setSelectedSkillLabels}
      selectedEducationLabels={selectedEducationLabels}
      setSelectedEducationLabels={setSelectedEducationLabels}
      selectedLabels={selectedLabels}
      setSelectedLabels={setSelectedLabels}
      selectedSpecializationIds={selectedSpecializationIds}
      setSelectedSpecializationIds={setSelectedSpecializationIds}
      selectedSpecializationLabels={selectedSpecializationLabels}
      setSelectedSpecializationLabels={setSelectedSpecializationLabels}
      searchableCityOptions={searchableCityOptions}
      searchableExperienceLevelOptions={searchableExperienceLevelOptions}
      searchableEducationLevelOptions={searchableEducationLevelOptions}
      searchableEmploymentTypeOptions={searchableEmploymentTypeOptions}
      displaySkillOptions={displaySkillOptions}
      displaySpecializationOptions={displaySpecializationOptions}
      onSearchCity={handleCitySearch}
      onSearchExperience={handleExperienceSearch}
      onSearchEducation={handleEducationSearch}
      onSearchEmployment={handleEmploymentSearch}
      onSearchSkill={handleSkillSearch}
      onSearchSpecialization={handleSpecializationSearch}
      isLoadingCities={citiesQuery.isFetching}
      isLoadingExperience={experienceLevelsQuery.isFetching}
      isLoadingEducation={educationLevelsQuery.isFetching}
      isLoadingEmployment={employmentTypesQuery.isFetching}
      isLoadingSkills={skillsQuery.isFetching}
      imagePreview={imagePreview}
      setImagePreview={setImagePreview}
      isAnyMutationPending={isAnyMutationPending}
      activeAction={activeAction}
      onSaveDraft={() => handleSave(false)}
      onSavePublish={() => handleSave(true)}
    />
  );
}
