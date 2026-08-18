import { useState, useEffect, useMemo, type Dispatch, type SetStateAction } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MultiSelect } from '@/components/ui/multi-select';
import { useMasterData } from '@/hooks/useMasterData';
import { FilterPanel } from '@/components/FilterPanel';
import { MultiSelectDropdown } from '@/components/MultiSelectDropdown';
import { eventsApi } from '@/api/services';
import type { MasterDataItem } from '@/types';
import { getYearOptions } from '@/utils/yearOptions';

export interface UserProfileFilters {
  startDate: string;
  endDate: string;
  countryIds: string[];
  stateIds: string[];
  cityIds: string[];
  skillIds: string[];
  experienceLevelIds: string[];
  educationLevelIds: string[];
  years: string[];
}

export const emptyUserProfileFilters: UserProfileFilters = {
  startDate: '',
  endDate: '',
  countryIds: [],
  stateIds: [],
  cityIds: [],
  skillIds: [],
  experienceLevelIds: [],
  educationLevelIds: [],
  years: [],
};

export function countActiveFilters(filters: UserProfileFilters): number {
  return Object.values(filters).filter((v) =>
    Array.isArray(v) ? v.length > 0 : !!v
  ).length;
}

export interface UserProfileFilterLabels {
  dateRange?: string;
  country?: string;
  state?: string;
  city?: string;
  skills?: string;
  experienceLevel?: string;
  education?: string;
  yearOfPassing?: string;
}

interface UserProfileFilterPanelProps {
  filters: UserProfileFilters;
  onApply: (filters: UserProfileFilters) => void;
  labels?: UserProfileFilterLabels;
  searchFirstLargeFilters?: boolean;
  countries?: MasterDataItem[];
  states?: MasterDataItem[];
  cities?: MasterDataItem[];
  onCountriesChange?: (ids: string[]) => void;
  onStatesChange?: (ids: string[]) => void;
  specializationOptions?: { id: string; value: string }[];
  selectedSpecializationIds?: string[];
  onSpecializationChange?: (ids: string[]) => void;
  onSpecializationSearch?: (value: string) => void;
  onEducationChange?: (ids: string[]) => void;
}

interface MasterDataSearchResponse {
  items?: MasterDataItem[];
  data?: {
    items?: MasterDataItem[];
  } | MasterDataItem[];
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
    const response = await eventsApi.searchMasterData(query, type);
    return getSearchItems(response as MasterDataSearchResponse | MasterDataItem[]);
  } catch {
    return [];
  }
}

function withSelectedItems(
  items: MasterDataItem[],
  selectedIds: string[],
  selectedLabels: Record<string, string>,
) {
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
}

function toDropdownOptions(items: MasterDataItem[]) {
  return items.map((item) => ({
    id: item.id,
    value: item.value,
  }));
}

export function UserProfileFilterPanel({
  filters,
  onApply,
  labels = {},
  searchFirstLargeFilters = false,
  countries: countriesOverride,
  states: statesOverride,
  cities: citiesOverride,
  onCountriesChange,
  onStatesChange,
  specializationOptions = [],
  selectedSpecializationIds = [],
  onSpecializationChange,
  onSpecializationSearch,
  onEducationChange,
}: UserProfileFilterPanelProps) {
  const [localFilters, setLocalFilters] = useState<UserProfileFilters>(filters);
  const [skillResults, setSkillResults] = useState<MasterDataItem[]>([]);
  const [experienceLevelResults, setExperienceLevelResults] = useState<MasterDataItem[]>([]);
  const [educationLevelResults, setEducationLevelResults] = useState<MasterDataItem[]>([]);
  const [skillLabels, setSkillLabels] = useState<Record<string, string>>({});
  const [experienceLevelLabels, setExperienceLevelLabels] = useState<Record<string, string>>({});
  const [educationLevelLabels, setEducationLevelLabels] = useState<Record<string, string>>({});

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const countriesQuery = useMasterData('LOCATION_COUNTRY');
  const statesQuery = useMasterData('LOCATION_STATE');
  const citiesQuery = useMasterData('LOCATION_CITY');

  const countries = countriesOverride ?? countriesQuery.data ?? [];
  const states = statesOverride ?? statesQuery.data ?? [];
  const cities = citiesOverride ?? citiesQuery.data ?? [];
  const { data: skills = [] } = useMasterData(searchFirstLargeFilters ? '' : 'SKILL');
  const { data: experienceLevels = [] } = useMasterData(searchFirstLargeFilters ? '' : 'EXPERIENCE_LEVEL');
  const { data: educationLevels = [] } = useMasterData(searchFirstLargeFilters ? '' : 'EDUCATION_LEVEL');
  const years = useMemo(() => getYearOptions(), []);

  const handleSkillSearch = useMemo(
    () => debounce(async (value: string) => setSkillResults(await searchMasterData(value, 'SKILL')), 300),
    [],
  );
  const handleExperienceLevelSearch = useMemo(
    () => debounce(async (value: string) => setExperienceLevelResults(await searchMasterData(value, 'EXPERIENCE_LEVEL')), 300),
    [],
  );
  const handleEducationLevelSearch = useMemo(
    () => debounce(async (value: string) => setEducationLevelResults(await searchMasterData(value, 'EDUCATION_LEVEL')), 300),
    [],
  );

  const skillSearchOptions = useMemo(
    () => toDropdownOptions(withSelectedItems(skillResults, localFilters.skillIds, skillLabels)),
    [skillLabels, skillResults, localFilters.skillIds],
  );
  const experienceLevelSearchOptions = useMemo(
    () => toDropdownOptions(withSelectedItems(experienceLevelResults, localFilters.experienceLevelIds, experienceLevelLabels)),
    [experienceLevelLabels, experienceLevelResults, localFilters.experienceLevelIds],
  );
  const educationLevelSearchOptions = useMemo(
    () => toDropdownOptions(withSelectedItems(educationLevelResults, localFilters.educationLevelIds, educationLevelLabels)),
    [educationLevelLabels, educationLevelResults, localFilters.educationLevelIds],
  );

  const set = (patch: Partial<UserProfileFilters>) =>
    setLocalFilters((prev) => ({ ...prev, ...patch }));

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

  const l = {
    dateRange: labels.dateRange ?? 'Date Range',
    country: labels.country ?? 'Country',
    state: labels.state ?? 'State',
    city: labels.city ?? 'City',
    skills: labels.skills ?? 'Skills',
    experienceLevel: labels.experienceLevel ?? 'Experience Level',
    education: labels.education ?? 'Education',
    yearOfPassing: labels.yearOfPassing ?? 'Year of Passing',
  };

  return (
    <FilterPanel
      activeCount={countActiveFilters(filters) + (selectedSpecializationIds.length > 0 ? 1 : 0)}
      className='min-w-[300px]'
      onApply={() => onApply(localFilters)}
      onReset={() => {
        setLocalFilters(emptyUserProfileFilters);
        onApply(emptyUserProfileFilters);
        onSpecializationChange?.([]);
        onEducationChange?.([]);
      }}
    >
      <div className="space-y-2">
        <Label>{l.dateRange}</Label>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-[10px] uppercase text-muted-foreground">From</Label>
            <Input type="date" value={localFilters.startDate} onChange={(e) => set({ startDate: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase text-muted-foreground">To</Label>
            <Input type="date" value={localFilters.endDate} onChange={(e) => set({ endDate: e.target.value })} />
          </div>
        </div>
      </div>
      <MultiSelect
        label={l.country}
        placeholder={`Select ${l.country.toLowerCase()}`}
        items={countries}
        selectedIds={localFilters.countryIds}
        onChange={(ids) => {
          // When country changes, clear dependent state/city selections
          set({ countryIds: ids, stateIds: [], cityIds: [] });
          onCountriesChange?.(ids);
        }}
      />
      <MultiSelect
        label={l.state}
        placeholder={`Select ${l.state.toLowerCase()}s`}
        items={states}
        selectedIds={localFilters.stateIds}
        onChange={(ids) => {
          // When state changes, clear dependent city selections
          set({ stateIds: ids, cityIds: [] });
          onStatesChange?.(ids);
        }}
      />
      <MultiSelect
        label={l.city}
        placeholder={`Select ${l.city.toLowerCase().replace(/y$/, 'ie')}s`}
        items={cities}
        selectedIds={localFilters.cityIds}
        onChange={(ids) => set({ cityIds: ids })}
      />
      {searchFirstLargeFilters ? (
        <MultiSelectDropdown
          label={l.skills}
          placeholder="Type to search skills."
          options={skillSearchOptions}
          selected={localFilters.skillIds}
          onChange={(ids) => {
            setSelectedLabels(ids, skillSearchOptions, setSkillLabels);
            set({ skillIds: ids });
          }}
          onSearch={handleSkillSearch}
        />
      ) : (
        <MultiSelect label={l.skills} placeholder={`Select ${l.skills.toLowerCase()}`} items={skills} selectedIds={localFilters.skillIds} onChange={(ids) => set({ skillIds: ids })} />
      )}
      {searchFirstLargeFilters ? (
        <MultiSelectDropdown
          label={l.experienceLevel}
          placeholder="Type to search experience levels."
          options={experienceLevelSearchOptions}
          selected={localFilters.experienceLevelIds}
          onChange={(ids) => {
            setSelectedLabels(ids, experienceLevelSearchOptions, setExperienceLevelLabels);
            set({ experienceLevelIds: ids });
          }}
          onSearch={handleExperienceLevelSearch}
        />
      ) : (
        <MultiSelect label={l.experienceLevel} placeholder={`Select ${l.experienceLevel.toLowerCase()}s`} items={experienceLevels} selectedIds={localFilters.experienceLevelIds} onChange={(ids) => set({ experienceLevelIds: ids })} />
      )}
     {searchFirstLargeFilters ? (
        <MultiSelectDropdown
          label={l.education}
          placeholder="Type to search qualifications."
          options={educationLevelSearchOptions}
          selected={localFilters.educationLevelIds}
          onChange={(ids) => {
            setSelectedLabels(ids, educationLevelSearchOptions, setEducationLevelLabels);
            set({ educationLevelIds: ids });
            if (!ids.length) {
              onSpecializationChange?.([]);
            }
            onEducationChange?.(ids);
          }}
          onSearch={handleEducationLevelSearch}
        />
      ) : (
        <MultiSelect label={l.education} placeholder={`Select ${l.education.toLowerCase()} levels`} items={educationLevels} selectedIds={localFilters.educationLevelIds} onChange={(ids) => {
          set({ educationLevelIds: ids });
          if (!ids.length) onSpecializationChange?.([]);
          onEducationChange?.(ids);
        }} />
      )}
      {onSpecializationChange && (
        <MultiSelectDropdown
          label="Specialization"
          placeholder={
            localFilters.educationLevelIds.length > 0
              ? 'Type to search specializations.'
              : 'Select education first'
          }
          options={specializationOptions}
          selected={selectedSpecializationIds}
          onChange={onSpecializationChange}
          disabled={localFilters.educationLevelIds.length === 0}
          onSearch={(value) => onSpecializationSearch?.(value)}
        />
      )}
      <MultiSelect label={l.yearOfPassing} placeholder="Select years" items={years} selectedIds={localFilters.years} onChange={(ids) => set({ years: ids })} />
    </FilterPanel>
  );
}
