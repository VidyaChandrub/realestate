import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { eventsApi, masterDataApi as coreMasterDataApi } from "@/api/services";
import type { MasterDataItem } from "@/types";
import { getYearOptions } from "@/utils/yearOptions";
import type { BroadcastTargetingRules } from "../types";

type SelectOption = { id: string; value: string };
type MasterDataListPayload = MasterDataItem[] | { data?: MasterDataItem[]; items?: MasterDataItem[] };

const toSelectOption = (item: MasterDataItem): SelectOption => ({ id: item.id, value: item.value });

const toMasterDataItems = (payload: MasterDataListPayload | undefined): MasterDataItem[] => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  return payload.data ?? payload.items ?? [];
};

const mergeOptions = (selectedOptions: SelectOption[], searchResults: MasterDataItem[]) => {
  const results = searchResults.map(toSelectOption);
  const selectedOnly = selectedOptions.filter(
    (option) => !results.some((result) => result.id === option.id),
  );
  return [...selectedOnly, ...results];
};

const uniqueMasterDataItems = (items: MasterDataItem[]) =>
  Array.from(new Map(items.map((item) => [item.id, item])).values());

const getMasterDataSlug = (items: MasterDataItem[], id: string) =>
  items.find((item) => item.id === id)?.slug;

/**
 * Encapsulates the same cascading targeting behaviour (Country -> State -> City,
 * Education -> Specialization) and master-data search behaviour used by
 * Advertisement targeting, adapted for a multi-select Country field. Kept local
 * to the Broadcast feature so the Advertisement module is never touched.
 */
export function useBroadcastTargeting() {
  const [countryIds, setCountryIdsRaw] = useState<string[]>([]);
  const [stateIds, setStateIdsRaw] = useState<string[]>([]);
  const [cityIds, setCityIds] = useState<string[]>([]);
  const [skillIds, setSkillIds] = useState<string[]>([]);
  const [experienceIds, setExperienceIds] = useState<string[]>([]);
  const [educationIds, setEducationIdsRaw] = useState<string[]>([]);
  const [specializationIds, setSpecializationIds] = useState<string[]>([]);
  const [yearOfPassing, setYearOfPassing] = useState<string[]>([]);

  const yearItems = useMemo(() => getYearOptions(), []);

  const [selectedSkillOptions, setSelectedSkillOptions] = useState<SelectOption[]>([]);
  const [selectedExperienceOptions, setSelectedExperienceOptions] = useState<SelectOption[]>([]);
  const [selectedEducationOptions, setSelectedEducationOptions] = useState<SelectOption[]>([]);
  const [selectedSpecializationOptions, setSelectedSpecializationOptions] = useState<SelectOption[]>([]);

  const [skillSearch, setSkillSearch] = useState("");
  const [experienceSearch, setExperienceSearch] = useState("");
  const [educationSearch, setEducationSearch] = useState("");
  const [specializationSearch, setSpecializationSearch] = useState("");
  const [locationSearch, setLocationSearch] = useState({ country: "", state: "", city: "" });

  // ── Country ──
  const { data: countriesData = [], isLoading: countriesLoading } = useQuery<MasterDataItem[]>({
    queryKey: ["broadcast-countries"],
    queryFn: eventsApi.getCountries,
    staleTime: 5 * 60 * 1000,
  });
  const countries = useMemo(() => toMasterDataItems(countriesData), [countriesData]);

  const { data: countrySearchResults = [], isLoading: countrySearchLoading } = useQuery<MasterDataItem[]>({
    queryKey: ["broadcast-country-search", locationSearch.country],
    queryFn: () => eventsApi.searchMasterData(locationSearch.country, "LOCATION_COUNTRY"),
    enabled: Boolean(locationSearch.country?.trim()),
    staleTime: 2 * 60 * 1000,
  });

  const missingCountryIds = useMemo(
    () => countryIds.filter((id) => !countries.some((c) => c.id === id)),
    [countryIds, countries],
  );

  const { data: selectedCountryItems = [] } = useQuery({
    queryKey: ["broadcast-selected-countries", missingCountryIds],
    queryFn: () => Promise.all(missingCountryIds.map((id) => coreMasterDataApi.getById(id))),
    enabled: missingCountryIds.length > 0,
    staleTime: 10 * 60 * 1000,
  });

  const countryOptionsSource = useMemo(
    () => uniqueMasterDataItems([...countries, ...selectedCountryItems, ...countrySearchResults]),
    [countries, selectedCountryItems, countrySearchResults],
  );

  const selectedCountryOptions = useMemo(
    () => countryOptionsSource.filter((c) => countryIds.includes(c.id)).map(toSelectOption),
    [countryOptionsSource, countryIds],
  );

  const countryDropdownOptions = useMemo(() => {
    if (locationSearch.country?.trim()) return mergeOptions(selectedCountryOptions, countrySearchResults);
    return mergeOptions(selectedCountryOptions, countryOptionsSource);
  }, [locationSearch.country, selectedCountryOptions, countrySearchResults, countryOptionsSource]);

  // ── State (depends on countryIds) ──
  const { data: statesData = [], isLoading: statesLoading } = useQuery<MasterDataItem[]>({
    queryKey: ["broadcast-states", countryIds],
    queryFn: async () => {
      if (!countryIds.length) return [];
      const slugs = countryIds
        .map((id) => getMasterDataSlug(countryOptionsSource, id))
        .filter((slug): slug is string => Boolean(slug));
      if (!slugs.length) return [];
      const results = await Promise.all(slugs.map((slug) => eventsApi.getStatesByCountrySlug(slug)));
      return uniqueMasterDataItems(results.flat());
    },
    enabled: countryIds.length > 0 && countryOptionsSource.length > 0,
    staleTime: 5 * 60 * 1000,
  });
  const states = useMemo(() => toMasterDataItems(statesData), [statesData]);

  const { data: stateSearchResults = [], isLoading: stateSearchLoading } = useQuery<MasterDataItem[]>({
    queryKey: ["broadcast-state-search", locationSearch.state],
    queryFn: () => eventsApi.searchMasterData(locationSearch.state, "LOCATION_STATE"),
    enabled: Boolean(locationSearch.state?.trim()),
    staleTime: 2 * 60 * 1000,
  });

  const missingStateIds = useMemo(
    () => stateIds.filter((id) => !states.some((s) => s.id === id)),
    [stateIds, states],
  );

  const { data: selectedStateItems = [] } = useQuery({
    queryKey: ["broadcast-selected-states", missingStateIds],
    queryFn: () => Promise.all(missingStateIds.map((id) => coreMasterDataApi.getById(id))),
    enabled: missingStateIds.length > 0,
    staleTime: 10 * 60 * 1000,
  });

  const stateOptionsSource = useMemo(
    () => uniqueMasterDataItems([...states, ...selectedStateItems, ...stateSearchResults]),
    [states, selectedStateItems, stateSearchResults],
  );

  const selectedStateOptions = useMemo(
    () => stateOptionsSource.filter((s) => stateIds.includes(s.id)).map(toSelectOption),
    [stateOptionsSource, stateIds],
  );

  const stateDropdownOptions = useMemo(() => {
    if (locationSearch.state?.trim()) return mergeOptions(selectedStateOptions, stateSearchResults);
    return mergeOptions(selectedStateOptions, states);
  }, [locationSearch.state, selectedStateOptions, stateSearchResults, states]);

  // ── City (depends on stateIds) ──
  const { data: citiesData = [], isLoading: citiesLoading } = useQuery<MasterDataItem[]>({
    queryKey: ["broadcast-cities", stateIds],
    queryFn: async () => {
      if (!stateIds.length) return [];
      const slugs = stateIds
        .map((id) => getMasterDataSlug(stateOptionsSource, id))
        .filter((slug): slug is string => Boolean(slug));
      if (!slugs.length) return [];
      const results = await Promise.all(slugs.map((slug) => eventsApi.getCitiesByStateSlug(slug)));
      return uniqueMasterDataItems(results.flat());
    },
    enabled: stateIds.length > 0 && stateOptionsSource.length > 0,
    staleTime: 5 * 60 * 1000,
  });
  const cities = useMemo(() => toMasterDataItems(citiesData), [citiesData]);

  const { data: citySearchResults = [], isLoading: citySearchLoading } = useQuery<MasterDataItem[]>({
    queryKey: ["broadcast-city-search", locationSearch.city],
    queryFn: () => eventsApi.searchMasterData(locationSearch.city, "LOCATION_CITY"),
    enabled: Boolean(locationSearch.city?.trim()),
    staleTime: 2 * 60 * 1000,
  });

  const missingCityIds = useMemo(
    () => cityIds.filter((id) => !cities.some((c) => c.id === id)),
    [cityIds, cities],
  );

  const { data: selectedCityItems = [] } = useQuery({
    queryKey: ["broadcast-selected-cities", missingCityIds],
    queryFn: () => Promise.all(missingCityIds.map((id) => coreMasterDataApi.getById(id))),
    enabled: missingCityIds.length > 0,
    staleTime: 10 * 60 * 1000,
  });

  const cityOptionsSource = useMemo(
    () => uniqueMasterDataItems([...cities, ...selectedCityItems, ...citySearchResults]),
    [cities, selectedCityItems, citySearchResults],
  );

  const selectedCityOptions = useMemo(
    () => cityOptionsSource.filter((c) => cityIds.includes(c.id)).map(toSelectOption),
    [cityOptionsSource, cityIds],
  );

  const cityDropdownOptions = useMemo(() => {
    if (locationSearch.city?.trim()) return mergeOptions(selectedCityOptions, citySearchResults);
    return mergeOptions(selectedCityOptions, cities);
  }, [locationSearch.city, selectedCityOptions, citySearchResults, cities]);

  // ── Skills ──
  const { data: selectedSkillItems = [] } = useQuery({
    queryKey: ["broadcast-selected-skills", skillIds],
    queryFn: () => Promise.all(skillIds.map((id) => coreMasterDataApi.getById(id))),
    enabled: skillIds.length > 0,
    staleTime: 10 * 60 * 1000,
  });
  const { data: skillSearchResults = [], isLoading: skillSearchLoading } = useQuery({
    queryKey: ["broadcast-skill-search", skillSearch],
    queryFn: () => eventsApi.searchMasterData(skillSearch, "SKILL"),
    enabled: Boolean(skillSearch?.trim()),
    staleTime: 2 * 60 * 1000,
  });

  // ── Experience Level ──
  const { data: selectedExperienceItems = [] } = useQuery({
    queryKey: ["broadcast-selected-experience-levels", experienceIds],
    queryFn: () => Promise.all(experienceIds.map((id) => coreMasterDataApi.getById(id))),
    enabled: experienceIds.length > 0,
    staleTime: 10 * 60 * 1000,
  });
  const { data: experienceSearchResults = [], isLoading: experienceSearchLoading } = useQuery({
    queryKey: ["broadcast-experience-search", experienceSearch],
    queryFn: () => eventsApi.searchMasterData(experienceSearch, "EXPERIENCE_LEVEL"),
    enabled: Boolean(experienceSearch?.trim()),
    staleTime: 2 * 60 * 1000,
  });

  // ── Education Level ──
  const { data: selectedEducationItems = [] } = useQuery({
    queryKey: ["broadcast-selected-education-levels", educationIds],
    queryFn: () => Promise.all(educationIds.map((id) => coreMasterDataApi.getById(id))),
    enabled: educationIds.length > 0,
    staleTime: 10 * 60 * 1000,
  });
  const { data: educationSearchResults = [], isLoading: educationSearchLoading } = useQuery({
    queryKey: ["broadcast-education-search", educationSearch],
    queryFn: () => eventsApi.searchMasterData(educationSearch, "EDUCATION_LEVEL"),
    enabled: Boolean(educationSearch?.trim()),
    staleTime: 2 * 60 * 1000,
  });

  useEffect(() => {
    if (selectedSkillItems.length > 0) setSelectedSkillOptions(selectedSkillItems.map(toSelectOption));
  }, [selectedSkillItems]);

  useEffect(() => {
    if (selectedExperienceItems.length > 0) setSelectedExperienceOptions(selectedExperienceItems.map(toSelectOption));
  }, [selectedExperienceItems]);

  useEffect(() => {
    if (selectedEducationItems.length > 0) setSelectedEducationOptions(selectedEducationItems.map(toSelectOption));
  }, [selectedEducationItems]);

  const skillDropdownOptions = useMemo(
    () => mergeOptions(selectedSkillOptions, skillSearchResults),
    [selectedSkillOptions, skillSearchResults],
  );
  const experienceDropdownOptions = useMemo(
    () => mergeOptions(selectedExperienceOptions, experienceSearchResults),
    [selectedExperienceOptions, experienceSearchResults],
  );
  const educationDropdownOptions = useMemo(
    () => mergeOptions(selectedEducationOptions, educationSearchResults),
    [selectedEducationOptions, educationSearchResults],
  );

  // ── Specialization (depends on educationIds) ──
  const { data: specializationSearchResults = [], isLoading: specializationSearchLoading } = useQuery({
    queryKey: ["broadcast-specialization-search", specializationSearch, educationIds],
    queryFn: () => eventsApi.searchMasterData(specializationSearch, "SPECIALIZATION"),
    enabled: Boolean(specializationSearch?.trim()) && educationIds.length > 0,
    staleTime: 2 * 60 * 1000,
  });

  const {
    data: specializationsByEducation = [],
    isLoading: specializationsByEducationLoading,
    isSuccess: isSpecializationsSuccess,
  } = useQuery({
    queryKey: ["broadcast-specializations-by-education", educationIds],
    queryFn: async () => {
      if (!educationIds.length) return [];
      const results = await Promise.all(
        educationIds.map((educationId) => eventsApi.getSpecializationsByEducationId(educationId)),
      );
      const merged = results.flat() as { id: string; value: string; parentId?: string | null }[];
      return Array.from(new Map(merged.map((item) => [item.id, item])).values());
    },
    enabled: educationIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // When education changes: clear orphaned specializations
  useEffect(() => {
    if (!educationIds.length) {
      if (specializationIds.length > 0) setSpecializationIds([]);
      if (selectedSpecializationOptions.length > 0) setSelectedSpecializationOptions([]);
      return;
    }

    if (specializationsByEducationLoading || !isSpecializationsSuccess) return;

    const validSpecializationIds = new Set(specializationsByEducation.map((item) => item.id));

    setSpecializationIds((current) => current.filter((id) => validSpecializationIds.has(id)));
    setSelectedSpecializationOptions((current) => current.filter((option) => validSpecializationIds.has(option.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [educationIds, specializationsByEducation, specializationsByEducationLoading, isSpecializationsSuccess]);

  // Restore selectedSpecializationOptions when re-hydrating: match specializationIds against loaded specializations
  useEffect(() => {
    if (!specializationIds.length || !specializationsByEducation.length) return;
    const missing = specializationIds.filter(
      (id) => !selectedSpecializationOptions.some((o) => o.id === id),
    );
    if (!missing.length) return;
    const restored = missing
      .map((id) => specializationsByEducation.find((s) => s.id === id))
      .filter((item): item is { id: string; value: string; parentId?: string | null } => Boolean(item));
    if (restored.length > 0) {
      setSelectedSpecializationOptions((prev) => [
        ...prev,
        ...restored.filter((r) => !prev.some((p) => p.id === r.id)),
      ]);
    }
  }, [specializationIds, specializationsByEducation, selectedSpecializationOptions]);

  const specializationDropdownOptions = useMemo(() => {
    const searchResults = specializationSearchResults
      .filter(
        (item: { id: string; value: string; parentId?: string | null }) =>
          !item.parentId || educationIds.includes(item.parentId),
      )
      .map((item: { id: string; value: string; parentId?: string | null }) => ({ id: item.id, value: item.value }));
    const notInResults = selectedSpecializationOptions.filter((o) => !searchResults.find((r) => r.id === o.id));
    return [...notInResults, ...searchResults];
  }, [specializationSearchResults, selectedSpecializationOptions, educationIds]);

  // ── Cascading change handlers ──
  const setCountryIds = (ids: string[]) => {
    const validCountryIds = new Set(ids);
    const nextStateIds = stateIds.filter((id) => {
      const state = stateOptionsSource.find((s) => s.id === id);
      return Boolean(state?.parentId && validCountryIds.has(state.parentId));
    });
    const validStateIds = new Set(nextStateIds);
    const nextCityIds = cityIds.filter((id) => {
      const city = cityOptionsSource.find((c) => c.id === id);
      return Boolean(city?.parentId && validStateIds.has(city.parentId));
    });
    setCountryIdsRaw(ids);
    setStateIdsRaw(nextStateIds);
    setCityIds(nextCityIds);
  };

  const setStateIds = (ids: string[]) => {
    const validStateIds = new Set(ids);
    const nextCityIds = cityIds.filter((id) => {
      const city = cityOptionsSource.find((c) => c.id === id);
      return Boolean(city?.parentId && validStateIds.has(city.parentId));
    });
    setStateIdsRaw(ids);
    setCityIds(nextCityIds);
  };

  const setEducationIds = (ids: string[]) => {
    // Orphaned specialization pruning is handled by the effect above once
    // the specializations for the new education selection have loaded.
    setEducationIdsRaw(ids);
  };

  const reset = () => {
    setCountryIdsRaw([]);
    setStateIdsRaw([]);
    setCityIds([]);
    setSkillIds([]);
    setExperienceIds([]);
    setEducationIdsRaw([]);
    setSpecializationIds([]);
    setYearOfPassing([]);
    setSelectedSkillOptions([]);
    setSelectedExperienceOptions([]);
    setSelectedEducationOptions([]);
    setSelectedSpecializationOptions([]);
    setSkillSearch("");
    setExperienceSearch("");
    setEducationSearch("");
    setSpecializationSearch("");
    setLocationSearch({ country: "", state: "", city: "" });
  };

  const targetingRules: BroadcastTargetingRules = {
    countryIds,
    stateIds,
    cityIds,
    skillIds,
    experienceLevelIds: experienceIds,
    educationLevelIds: educationIds,
    specializationIds,
    yearOfPassing,
  };

  return {
    country: {
      options: countryDropdownOptions,
      selected: countryIds,
      onChange: setCountryIds,
      isLoading: countriesLoading || countrySearchLoading,
      onSearch: (value: string) => setLocationSearch((prev) => ({ ...prev, country: value })),
    },
    state: {
      options: stateDropdownOptions,
      selected: stateIds,
      onChange: setStateIds,
      isLoading: statesLoading || stateSearchLoading,
      onSearch: (value: string) => setLocationSearch((prev) => ({ ...prev, state: value })),
      disabled: countryIds.length === 0,
    },
    city: {
      options: cityDropdownOptions,
      selected: cityIds,
      onChange: setCityIds,
      isLoading: citiesLoading || citySearchLoading,
      onSearch: (value: string) => setLocationSearch((prev) => ({ ...prev, city: value })),
      disabled: stateIds.length === 0,
    },
    skills: {
      options: skillDropdownOptions,
      selected: skillIds,
      onChange: (ids: string[]) => {
        setSkillIds(ids);
        setSelectedSkillOptions(
          ids
            .map((id) => skillDropdownOptions.find((o) => o.id === id))
            .filter((o): o is SelectOption => Boolean(o)),
        );
      },
      isLoading: skillSearchLoading,
      onSearch: setSkillSearch,
    },
    experience: {
      options: experienceDropdownOptions,
      selected: experienceIds,
      onChange: (ids: string[]) => {
        setExperienceIds(ids);
        setSelectedExperienceOptions(
          ids
            .map((id) => experienceDropdownOptions.find((o) => o.id === id))
            .filter((o): o is SelectOption => Boolean(o)),
        );
      },
      isLoading: experienceSearchLoading,
      onSearch: setExperienceSearch,
    },
    education: {
      options: educationDropdownOptions,
      selected: educationIds,
      onChange: (ids: string[]) => {
        setEducationIds(ids);
        setSelectedEducationOptions(
          ids
            .map((id) => educationDropdownOptions.find((o) => o.id === id))
            .filter((o): o is SelectOption => Boolean(o)),
        );
      },
      isLoading: educationSearchLoading,
      onSearch: setEducationSearch,
    },
    specialization: {
      options: specializationDropdownOptions,
      selected: specializationIds,
      onChange: (ids: string[]) => {
        setSpecializationIds(ids);
        setSelectedSpecializationOptions(
          ids
            .map((id) => specializationDropdownOptions.find((o) => o.id === id))
            .filter((o): o is SelectOption => Boolean(o)),
        );
      },
      isLoading: specializationSearchLoading || specializationsByEducationLoading,
      onSearch: setSpecializationSearch,
      disabled: educationIds.length === 0,
    },
    yearOfPassing: {
      selected: yearOfPassing,
      onChange: setYearOfPassing,
      items: yearItems,
    },
    reset,
    targetingRules,
  };
}

export type UseBroadcastTargeting = ReturnType<typeof useBroadcastTargeting>;
