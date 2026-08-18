import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { useQuery } from '@tanstack/react-query';
import { eventsApi } from '@/api/services';
import type { Employer, MasterDataItem } from '@/types';
import {
  emptyLocationSearchTerms,
  findMasterDataByValue,
  type EmployerEditForm,
  type LocationSearchTerms,
  withSelectedMasterDataItem,
} from './organizationEditUtils';

type SetEmployerEditForm = Dispatch<SetStateAction<EmployerEditForm>>;

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

export function useEmployerLocationSelects(employer: Employer | undefined, setEditForm: SetEmployerEditForm) {
  const [selectedCountryId, setSelectedCountryId] = useState('');
  const [selectedStateId, setSelectedStateId] = useState('');
  const [selectedCityId, setSelectedCityId] = useState('');
  const [selectedCountryItem, setSelectedCountryItem] = useState<MasterDataItem | null>(null);
  const [selectedStateItem, setSelectedStateItem] = useState<MasterDataItem | null>(null);
  const [selectedCityItem, setSelectedCityItem] = useState<MasterDataItem | null>(null);
  const [locationSearchTerms, setLocationSearchTerms] = useState(emptyLocationSearchTerms);
  const debouncedLocationSearchTerms = useDebouncedLocationSearchTerms(locationSearchTerms);

  const { data: countries = [], isLoading: countriesLoading } = useQuery({
    queryKey: ['employer-edit-countries'],
    queryFn: eventsApi.getCountries,
    staleTime: 5 * 60 * 1000,
  });

  const selectedCountry = useMemo(
    () => selectedCountryItem ?? countries.find((country) => country.id === selectedCountryId),
    [countries, selectedCountryId, selectedCountryItem]
  );

  const { data: states = [], isLoading: statesLoading } = useQuery({
    queryKey: ['employer-edit-states', selectedCountry?.slug],
    queryFn: () => eventsApi.getStatesByCountrySlug(selectedCountry!.slug),
    enabled: Boolean(selectedCountry?.slug),
    staleTime: 5 * 60 * 1000,
  });

  const selectedState = useMemo(
    () => selectedStateItem ?? states.find((state) => state.id === selectedStateId),
    [selectedStateId, selectedStateItem, states]
  );

  const { data: cities = [], isLoading: citiesLoading } = useQuery({
    queryKey: ['employer-edit-cities', selectedState?.slug],
    queryFn: () => eventsApi.getCitiesByStateSlug(selectedState!.slug),
    enabled: Boolean(selectedState?.slug),
    staleTime: 5 * 60 * 1000,
  });

  const selectedCity = useMemo(
    () => selectedCityItem ?? cities.find((city) => city.id === selectedCityId),
    [cities, selectedCityId, selectedCityItem]
  );

  const { data: searchedCountries = [] } = useQuery({
    queryKey: ['employer-edit-search-countries', debouncedLocationSearchTerms.country],
    queryFn: () => eventsApi.searchMasterData(debouncedLocationSearchTerms.country, 'LOCATION_COUNTRY'),
    enabled: debouncedLocationSearchTerms.country.length >= 3,
    staleTime: 2 * 60 * 1000,
  });

  const { data: searchedStates = [] } = useQuery({
    queryKey: ['employer-edit-search-states', selectedCountryId, debouncedLocationSearchTerms.state],
    queryFn: () => eventsApi.searchMasterData(debouncedLocationSearchTerms.state, 'LOCATION_STATE'),
    enabled: Boolean(selectedCountryId) && debouncedLocationSearchTerms.state.length >= 3,
    staleTime: 2 * 60 * 1000,
  });

  const { data: searchedCities = [] } = useQuery({
    queryKey: ['employer-edit-search-cities', selectedStateId, debouncedLocationSearchTerms.city],
    queryFn: () => eventsApi.searchMasterData(debouncedLocationSearchTerms.city, 'LOCATION_CITY'),
    enabled: Boolean(selectedStateId) && debouncedLocationSearchTerms.city.length >= 3,
    staleTime: 2 * 60 * 1000,
  });

  const countryOptions = useMemo(
    () =>
      withSelectedMasterDataItem(
        debouncedLocationSearchTerms.country.length >= 3 ? searchedCountries : countries,
        selectedCountry
      ),
    [countries, debouncedLocationSearchTerms.country, searchedCountries, selectedCountry]
  );

  const stateOptions = useMemo(() => {
    const baseStates =
      debouncedLocationSearchTerms.state.length >= 3
        ? searchedStates.filter((state) => !state.parentId || state.parentId === selectedCountryId)
        : states;

    return withSelectedMasterDataItem(baseStates, selectedState);
  }, [debouncedLocationSearchTerms.state, searchedStates, selectedCountryId, selectedState, states]);

  const cityOptions = useMemo(() => {
    const baseCities =
      debouncedLocationSearchTerms.city.length >= 3
        ? searchedCities.filter((city) => !city.parentId || city.parentId === selectedStateId)
        : cities;

    return withSelectedMasterDataItem(baseCities, selectedCity);
  }, [cities, debouncedLocationSearchTerms.city, searchedCities, selectedCity, selectedStateId]);

  useEffect(() => {
    setSelectedCountryId('');
    setSelectedStateId('');
    setSelectedCityId('');
    setSelectedCountryItem(null);
    setSelectedStateItem(null);
    setSelectedCityItem(null);
    setLocationSearchTerms(emptyLocationSearchTerms);
  }, [employer?.id]);

  useEffect(() => {
    if (!employer || selectedCountryId || !employer.country) return;

    const country = findMasterDataByValue(countries, employer.country);
    if (country) {
      setSelectedCountryId(country.id);
      setSelectedCountryItem(country);
    }
  }, [countries, employer, selectedCountryId]);

  useEffect(() => {
    if (!employer || selectedStateId || !selectedCountryId || !employer.state) return;

    const state = findMasterDataByValue(states, employer.state);
    if (state) {
      setSelectedStateId(state.id);
      setSelectedStateItem(state);
    }
  }, [employer, selectedCountryId, selectedStateId, states]);

  useEffect(() => {
    if (!employer || selectedCityId || !selectedStateId || !employer.city) return;

    const city = findMasterDataByValue(cities, employer.city);
    if (city) {
      setSelectedCityId(city.id);
      setSelectedCityItem(city);
    }
  }, [cities, employer, selectedCityId, selectedStateId]);

  return {
    selectedCountryId,
    selectedStateId,
    selectedCityId,
    countryOptions,
    stateOptions,
    cityOptions,
    countriesLoading,
    statesLoading,
    citiesLoading,
    onCountrySearch: (value: string) => setLocationSearchTerms((terms) => ({ ...terms, country: value })),
    onStateSearch: (value: string) => setLocationSearchTerms((terms) => ({ ...terms, state: value })),
    onCitySearch: (value: string) => setLocationSearchTerms((terms) => ({ ...terms, city: value })),
    onCountryChange: (countryId: string) => {
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
    },
    onStateChange: (stateId: string) => {
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
    },
    onCityChange: (cityId: string) => {
      const city = cityOptions.find((item) => item.id === cityId);

      setSelectedCityId(cityId);
      setSelectedCityItem(city ?? null);
      setEditForm((form) => ({
        ...form,
        city: city?.value ?? '',
      }));
    },
  };
}
