import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { CloudUpload, ImageIcon, Plus, Eye, Trash2, Menu } from "lucide-react";
import { AdPlacement, AdStatus, AdDisplayType, AdCtaButtonStyle, AdCtaButtonSize, AdCtaButtonPlacement } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { MultiSelect } from "@/components/ui/multi-select";
import { MultiSelectDropdown } from "@/components/MultiSelectDropdown";
import type { AdvertisementContentFormat } from "../types/ad-form";
import type { UseAdvertisementFormState } from "../hooks/useAdvertisementFormState";
import { HtmlEditor, YoutubeUrlInput } from "./format-editors";
import { advertisementsApi } from "@/api/advertisements";
import { useNavigate } from "react-router-dom";
import { eventsApi, masterDataApi as coreMasterDataApi } from "@/api/services";
import type { MasterDataItem } from "@/types";
import { getYearOptions } from "@/utils/yearOptions";

const MAX_UPLOAD_MB = 2;
const ACCEPT_TYPES = "image/gif,image/jpeg,image/png,image/webp";
const ACCEPTED_MIME_TYPES = new Set(ACCEPT_TYPES.split(","));

function RequiredMark() {
  return <span className="text-destructive"> *</span>;
}

function getApiErrorMessage(error: unknown, fallback: string): string {
  const data = (error as { response?: { data?: { message?: unknown } } })?.response?.data;
  const message = data?.message;

  if (typeof message === "string" && message.trim()) {
    return message;
  }

  if (Array.isArray(message)) {
    const parts = message.filter((item): item is string => typeof item === "string" && item.trim());
    if (parts.length > 0) {
      return parts.join(". ");
    }
  }

  return fallback;
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function extractYoutubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }

  return null;
}

function yearOptions() {
  const end = new Date().getFullYear() + 1;
  const years: number[] = [];
  for (let y = end; y >= 1990; y -= 1) years.push(y);
  return years;
}

type SelectOption = { id: string; value: string };
type MasterDataListPayload = MasterDataItem[] | { data?: MasterDataItem[]; items?: MasterDataItem[] };

const toSelectOption = (item: MasterDataItem): SelectOption => ({
  id: item.id,
  value: item.value,
});

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

interface CreateAdvertisementFormProps {
  onCancel: () => void;
  formState: UseAdvertisementFormState;
  isReadOnly?: boolean;
  adId?: string;
}

export function CreateAdvertisementForm({
  onCancel,
  formState,
  isReadOnly = false,
  adId,
}: CreateAdvertisementFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const {
    adType,
    setAdType,
    format,
    setFormat,
    title,
    setTitle,
    redirectUrl,
    setRedirectUrl,
    ctaText,
    setCtaText,
    ctaTextColor,
    setCtaTextColor,
    ctaBackgroundColor,
    setCtaBackgroundColor,
    ctaButtonStyle,
    setCtaButtonStyle,
    ctaButtonSize,
    setCtaButtonSize,
    ctaButtonPlacement,
    setCtaButtonPlacement,
    status,
    setStatus,
    htmlContent,
    setHtmlContent,
    youtubeUrl,
    setYoutubeUrl,
    mediaItems,
    setMediaItems,
    previewUrls,
    priority,
    setPriority,
    startDate,
    setStartDate,
    startTime,
    setStartTime,
    endDate,
    setEndDate,
    endTime,
    setEndTime,
    countryId,
    setCountryId,
    stateIds,
    setStateIds,
    cityIds,
    setCityIds,
    rawLocationIds,
    setRawLocationIds,
    skillIds,
    setSkillIds,
    experienceIds,
    setExperienceIds,
    educationIds,
    setEducationIds,
    specializationIds,
    setSpecializationIds,
    selectedSpecializationOptions,
    setSelectedSpecializationOptions,
    specializationSearch,
    setSpecializationSearch,
    yearOfPassing,
    setYearOfPassing,
  } = formState;

  const navigate = useNavigate();

  // Fetch Locations (Country, State, City)
  const { data: locations, isLoading: locationsLoading } = useQuery({
    queryKey: ["advertisement-locations"],
    queryFn: () => masterDataApi.getLocations(),
  });

  const [skillSearch, setSkillSearch] = useState("");
  const [selectedSkillOptions, setSelectedSkillOptions] = useState<SelectOption[]>([]);
  const [experienceSearch, setExperienceSearch] = useState("");
  const [selectedExperienceOptions, setSelectedExperienceOptions] = useState<SelectOption[]>([]);
  const [educationSearch, setEducationSearch] = useState("");
  const [selectedEducationOptions, setSelectedEducationOptions] = useState<SelectOption[]>([]);
  const [locationSearch, setLocationSearch] = useState({
    country: "",
    state: "",
    city: "",
  });

  const { data: countriesData = [], isLoading: countriesLoading } = useQuery<MasterDataItem[]>({
    queryKey: ["advertisement-countries"],
    queryFn: eventsApi.getCountries,
    staleTime: 5 * 60 * 1000,
  });

  const countries = useMemo(
    () => toMasterDataItems(countriesData),
    [countriesData],
  );

  const { data: countrySearchResults = [], isLoading: countrySearchLoading } = useQuery<MasterDataItem[]>({
    queryKey: ["advertisement-country-search", locationSearch.country],
    queryFn: () => eventsApi.searchMasterData(locationSearch.country, "LOCATION_COUNTRY"),
    enabled: Boolean(locationSearch.country?.trim()),
    staleTime: 2 * 60 * 1000,
  });

  const { data: stateSearchResults = [], isLoading: stateSearchLoading } = useQuery<MasterDataItem[]>({
    queryKey: ["advertisement-state-search", locationSearch.state],
    queryFn: () => eventsApi.searchMasterData(locationSearch.state, "LOCATION_STATE"),
    enabled: Boolean(locationSearch.state?.trim()),
    staleTime: 2 * 60 * 1000,
  });

  const { data: citySearchResults = [], isLoading: citySearchLoading } = useQuery<MasterDataItem[]>({
    queryKey: ["advertisement-city-search", locationSearch.city],
    queryFn: () => eventsApi.searchMasterData(locationSearch.city, "LOCATION_CITY"),
    enabled: Boolean(locationSearch.city?.trim()),
    staleTime: 2 * 60 * 1000,
  });

  const { data: selectedCountryItems = [] } = useQuery({
    queryKey: ["advertisement-selected-countries", countryId],
    queryFn: () => coreMasterDataApi.getById(countryId),
    enabled: Boolean(countryId) && !countries.some((country) => country.id === countryId),
    staleTime: 10 * 60 * 1000,
  });

  const selectedCountryList = useMemo(
    () => (Array.isArray(selectedCountryItems) ? selectedCountryItems : selectedCountryItems ? [selectedCountryItems] : []),
    [selectedCountryItems],
  );

  const countryOptionsSource = useMemo(
    () => uniqueMasterDataItems([...countries, ...selectedCountryList, ...countrySearchResults]),
    [countries, countrySearchResults, selectedCountryList],
  );

  const { data: statesData = [], isLoading: statesLoading } = useQuery<MasterDataItem[]>({
    queryKey: ["advertisement-states", countryId],
    queryFn: () => {
      const slug = getMasterDataSlug(countryOptionsSource, countryId);
      return slug ? eventsApi.getStatesByCountrySlug(slug) : Promise.resolve([]);
    },
    enabled: Boolean(countryId) && countryOptionsSource.length > 0,
    staleTime: 5 * 60 * 1000,
    keepPreviousData: true,
  });

  const states = useMemo(
    () => toMasterDataItems(statesData),
    [statesData],
  );

  const missingStateIds = useMemo(
    () => stateIds.filter((id) => !states.some((state) => state.id === id)),
    [stateIds, states],
  );

  const { data: selectedStateItems = [] } = useQuery({
    queryKey: ["advertisement-selected-states", missingStateIds],
    queryFn: () => Promise.all(missingStateIds.map((id) => coreMasterDataApi.getById(id))),
    enabled: missingStateIds.length > 0,
    staleTime: 10 * 60 * 1000,
  });

  const stateOptionsSource = useMemo(
    () => uniqueMasterDataItems([...states, ...selectedStateItems, ...stateSearchResults]),
    [states, selectedStateItems, stateSearchResults],
  );

  const { data: citiesData = [], isLoading: citiesLoading } = useQuery<MasterDataItem[]>({
    queryKey: ["advertisement-cities", stateIds],
    queryFn: async () => {
      if (!stateIds.length) return [];

      const stateSlugs = stateIds
        .map((stateId) => getMasterDataSlug(stateOptionsSource, stateId))
        .filter((slug): slug is string => Boolean(slug));

      if (!stateSlugs.length) return [];

      const results = await Promise.all(
        stateSlugs.map((slug) => eventsApi.getCitiesByStateSlug(slug)),
      );

      return results.flat();
    },
    enabled: stateIds.length > 0 && stateOptionsSource.length > 0,
    staleTime: 5 * 60 * 1000,
    keepPreviousData: true,
  });

  const cities = useMemo(
    () => toMasterDataItems(citiesData),
    [citiesData],
  );

  const missingCityIds = useMemo(
    () => cityIds.filter((id) => !cities.some((city) => city.id === id)),
    [cityIds, cities],
  );

  const { data: selectedCityItems = [] } = useQuery({
    queryKey: ["advertisement-selected-cities", missingCityIds],
    queryFn: () => Promise.all(missingCityIds.map((id) => coreMasterDataApi.getById(id))),
    enabled: missingCityIds.length > 0,
    staleTime: 10 * 60 * 1000,
  });

  const cityOptionsSource = useMemo(
    () => uniqueMasterDataItems([...cities, ...selectedCityItems, ...citySearchResults]),
    [cities, citySearchResults, selectedCityItems],
  );

  const { data: selectedSkillItems = [] } = useQuery({
    queryKey: ["advertisement-selected-skills", skillIds],
    queryFn: () => Promise.all(skillIds.map((id) => coreMasterDataApi.getById(id))),
    enabled: skillIds.length > 0,
    staleTime: 10 * 60 * 1000,
  });

  const { data: selectedExperienceItems = [] } = useQuery({
    queryKey: ["advertisement-selected-experience-levels", experienceIds],
    queryFn: () => Promise.all(experienceIds.map((id) => coreMasterDataApi.getById(id))),
    enabled: experienceIds.length > 0,
    staleTime: 10 * 60 * 1000,
  });

  const { data: selectedEducationItems = [] } = useQuery({
    queryKey: ["advertisement-selected-education-levels", educationIds],
    queryFn: () => Promise.all(educationIds.map((id) => coreMasterDataApi.getById(id))),
    enabled: educationIds.length > 0,
    staleTime: 10 * 60 * 1000,
  });

  const { data: skillSearchResults = [], isLoading: skillSearchLoading } = useQuery({
    queryKey: ["advertisement-skill-search", skillSearch],
    queryFn: () => eventsApi.searchMasterData(skillSearch, "SKILL"),
    enabled: Boolean(skillSearch?.trim()),
    staleTime: 2 * 60 * 1000,
  });

  const { data: experienceSearchResults = [], isLoading: experienceSearchLoading } = useQuery({
    queryKey: ["advertisement-experience-search", experienceSearch],
    queryFn: () => eventsApi.searchMasterData(experienceSearch, "EXPERIENCE_LEVEL"),
    enabled: Boolean(experienceSearch?.trim()),
    staleTime: 2 * 60 * 1000,
  });

  const { data: educationSearchResults = [], isLoading: educationSearchLoading } = useQuery({
    queryKey: ["advertisement-education-search", educationSearch],
    queryFn: () => eventsApi.searchMasterData(educationSearch, "EDUCATION_LEVEL"),
    enabled: Boolean(educationSearch?.trim()),
    staleTime: 2 * 60 * 1000,
  });

  const { data: specializationSearchResults = [], isLoading: specializationSearchLoading } = useQuery({
    queryKey: ["advertisement-specialization-search", specializationSearch, educationIds],
    queryFn: () => eventsApi.searchMasterData(specializationSearch, "SPECIALIZATION"),
    enabled: Boolean(specializationSearch?.trim()) && educationIds.length > 0,
    staleTime: 2 * 60 * 1000,
  });

  // Load specializations for all selected education levels
  const { data: specializationsByEducation = [], isLoading: specializationsByEducationLoading, isSuccess: isSpecializationsSuccess } = useQuery({
    queryKey: ["advertisement-specializations-by-education", educationIds],
    queryFn: async () => {
      if (!educationIds.length) return [];
      const results = await Promise.all(
        educationIds.map((educationId) => eventsApi.getSpecializationsByEducationId(educationId))
      );
      const merged = results.flat() as { id: string; value: string; parentId?: string | null }[];
      // Deduplicate
      return Array.from(new Map(merged.map((item) => [item.id, item])).values());
    },
    enabled: educationIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (selectedSkillItems.length > 0) {
      setSelectedSkillOptions(selectedSkillItems.map(toSelectOption));
    }
  }, [selectedSkillItems]);

  useEffect(() => {
    if (selectedExperienceItems.length > 0) {
      setSelectedExperienceOptions(selectedExperienceItems.map(toSelectOption));
    }
  }, [selectedExperienceItems]);

  useEffect(() => {
    if (selectedEducationItems.length > 0) {
      setSelectedEducationOptions(selectedEducationItems.map(toSelectOption));
    }
  }, [selectedEducationItems]);

  // When education changes: clear orphaned specializations
  useEffect(() => {
    if (!educationIds.length) {
      setSpecializationIds([]);
      setSelectedSpecializationOptions([]);
      return;
    }

    if (specializationsByEducationLoading || !isSpecializationsSuccess) return;

    const validSpecializationIds = new Set(
      specializationsByEducation.map((item) => item.id)
    );

    setSpecializationIds((current) =>
      current.filter((id) => validSpecializationIds.has(id))
    );

    setSelectedSpecializationOptions((current) =>
      current.filter((option) => validSpecializationIds.has(option.id))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [educationIds, specializationsByEducation, specializationsByEducationLoading, isSpecializationsSuccess]);

  // Restore selectedSpecializationOptions when editing: match specializationIds against loaded specializations
  useEffect(() => {
    if (!specializationIds.length || !specializationsByEducation.length) return;
    // Only fill options that are missing
    const missing = specializationIds.filter(
      (id) => !selectedSpecializationOptions.some((o) => o.id === id)
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

  const specializationDropdownOptions = useMemo(() => {
    const searchResults = specializationSearchResults
      .filter((item: { id: string; value: string; parentId?: string | null }) =>
        !item.parentId || educationIds.includes(item.parentId)
      )
      .map((item: { id: string; value: string; parentId?: string | null }) => ({
        id: item.id,
        value: item.value,
      }));
    const notInResults = selectedSpecializationOptions.filter(
      (o) => !searchResults.find((r) => r.id === o.id)
    );
    return [...notInResults, ...searchResults];
  }, [specializationSearchResults, selectedSpecializationOptions, educationIds]);

  const selectedCountryOptions = useMemo(
    () => (countryId ? countryOptionsSource.filter((country) => country.id === countryId).map(toSelectOption) : []),
    [countryId, countryOptionsSource],
  );

  const selectedStateOptions = useMemo(
    () => stateOptionsSource.filter((state) => stateIds.includes(state.id)).map(toSelectOption),
    [stateIds, stateOptionsSource],
  );

  const selectedCityOptions = useMemo(
    () => cityOptionsSource.filter((city) => cityIds.includes(city.id)).map(toSelectOption),
    [cityIds, cityOptionsSource],
  );

  const countryDropdownOptions = useMemo(() => {
    if (locationSearch.country?.trim()) {
      return mergeOptions(selectedCountryOptions, countrySearchResults);
    }
    return mergeOptions(selectedCountryOptions, countryOptionsSource);
  }, [countryOptionsSource, countrySearchResults, locationSearch.country, selectedCountryOptions]);

  const stateDropdownOptions = useMemo(() => {
    if (locationSearch.state?.trim()) {
      return mergeOptions(selectedStateOptions, stateSearchResults);
    }
    return mergeOptions(selectedStateOptions, states);
  }, [locationSearch.state, selectedStateOptions, stateSearchResults, states]);

  const cityDropdownOptions = useMemo(() => {
    if (locationSearch.city?.trim()) {
      return mergeOptions(selectedCityOptions, citySearchResults);
    }
    return mergeOptions(selectedCityOptions, cities);
  }, [cities, citySearchResults, locationSearch.city, selectedCityOptions]);

  const yearItems = useMemo(() => getYearOptions(), []);

  const allowMultipleFiles = adType === "card";
  const showCtaField = true;
  const requiresImageUpload = format === "default";

  const clearFieldError = useCallback((field: string) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const validateForm = useCallback((): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (!title.trim()) {
      errors.title = "Ad title is required.";
    }

    if ((format === "default" || format === "html") && !redirectUrl.trim()) {
      errors.redirectUrl = "Redirect URL is required.";
    } else if ((format === "default" || format === "html") && !isValidHttpUrl(redirectUrl.trim())) {
      errors.redirectUrl = "Redirect URL must be a valid URL starting with http:// or https://.";
    }

    if (format === "html" && !htmlContent.trim()) {
      errors.htmlContent = "Custom HTML layout is required.";
    }

    if (format === "youtube") {
      if (!youtubeUrl.trim()) {
        errors.youtubeUrl = "YouTube URL is required.";
      } else if (!extractYoutubeVideoId(youtubeUrl.trim())) {
        errors.youtubeUrl = "Enter a valid YouTube video URL.";
      }
    }

    if (requiresImageUpload && mediaItems.length === 0) {
      errors.media = allowMultipleFiles
        ? "At least one image is required."
        : "An image is required.";
    }

    if (!startDate || !startTime || !endDate || !endTime) {
      errors.schedule = "Start and end date/time are required.";
    } else {
      const now = new Date();
      const start = new Date(`${startDate}T${startTime}:00`);
      const end = new Date(`${endDate}T${endTime}:00`);

      if (start < now) {
        errors.startDateTime = "Start date/time cannot be in the past.";
      }

      if (end < now) {
        errors.endDateTime = "End date/time cannot be in the past.";
      }

      if (end <= start) {
        errors.endDateTime = "End date/time must be after the start date/time.";
      }
    }

    return errors;
  }, [
    allowMultipleFiles,
    endDate,
    endTime,
    format,
    htmlContent,
    mediaItems.length,
    redirectUrl,
    requiresImageUpload,
    startDate,
    startTime,
    title,
    youtubeUrl,
  ]);

  const validateFiles = useCallback((incoming: File[]) => {
    const next: File[] = [];
    for (const file of incoming) {
      if (!ACCEPTED_MIME_TYPES.has(file.type)) {
        toast.error(`${file.name} is not supported. Use GIF, JPG, PNG, or WebP.`);
        continue;
      }
      if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
        toast.error(`${file.name} exceeds ${MAX_UPLOAD_MB}MB.`);
        continue;
      }
      next.push(file);
    }
    return next;
  }, []);

  const mergeFiles = useCallback(
    (incoming: File[]) => {
      const valid = validateFiles(incoming);
      if (valid.length === 0) return;

      clearFieldError("media");
      if (allowMultipleFiles) {
        setMediaItems((prev) => {
          const names = new Set(prev.map((item) => item.type === 'NEW' ? `${item.file.name}-${item.file.size}` : item.url));
          const merged = [...prev];
          for (const f of valid) {
            const key = `${f.name}-${f.size}`;
            if (!names.has(key)) {
              names.add(key);
              merged.push({ id: crypto.randomUUID(), type: 'NEW', file: f });
            }
          }
          return merged;
        });
      } else {
        setMediaItems(valid.slice(0, 1).map(f => ({ id: crypto.randomUUID(), type: 'NEW', file: f })));
      }
    },
    [allowMultipleFiles, clearFieldError, validateFiles, setMediaItems],
  );

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list?.length) return;
    mergeFiles(Array.from(list));
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!e.dataTransfer.files?.length) return;
    mergeFiles(Array.from(e.dataTransfer.files));
  };

  const removeMediaAt = (index: number) => {
    setMediaItems((prev) => prev.filter((_, i) => i !== index));
  };

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    setMediaItems((prev) => {
      const next = [...prev];
      const [itemToMove] = next.splice(draggedIndex, 1);
      next.splice(dropIndex, 0, itemToMove);
      return next;
    });
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleSave = async (targetStatus?: AdStatus) => {
    const errors = validateForm();
    setFieldErrors(errors);

    const errorMessages = Object.values(errors);
    if (errorMessages.length > 0) {
      toast.error(errorMessages[0]);
      return;
    }

    try {
      let media: any[] = [];
      if (format === "html" && htmlContent) {
        media.push({ mediaUrl: htmlContent, mediaType: 'HTML' });
      } else if (format === "youtube" && youtubeUrl) {
        media.push({ mediaUrl: youtubeUrl, mediaType: 'VIDEO' });
      } else if (requiresImageUpload) {
        const itemsToUpload = mediaItems.filter(m => m.type === 'NEW');
        if (itemsToUpload.length > 0) {
          toast.loading("Uploading images…", { id: "upload-progress" });
        }

        for (let i = 0; i < mediaItems.length; i++) {
          const item = mediaItems[i];
          if (item.type === 'NEW') {
            try {
              const result = await advertisementsApi.uploadImage(item.file);
              media.push({ mediaUrl: result.url, mediaType: 'IMAGE', order: i });
            } catch (uploadError) {
              toast.dismiss("upload-progress");
              toast.error(
                getApiErrorMessage(
                  uploadError,
                  `Failed to upload "${item.file.name}". Please try again.`,
                ),
              );
              return;
            }
          } else {
            media.push({ mediaUrl: item.url, mediaType: 'IMAGE', order: i });
          }
        }
        toast.dismiss("upload-progress");
      }

      // CTA and redirect URL are not applicable for html/youtube formats
      const isCtaApplicable = adType !== 'banner' && format === 'default';

      const payload: Record<string, any> = {
        title: title,
        description: "",
        redirectUrl: format !== "youtube" ? redirectUrl : undefined,
        ctaText: isCtaApplicable ? ctaText : undefined,
        ctaTextColor: isCtaApplicable ? ctaTextColor : undefined,
        ctaBackgroundColor: isCtaApplicable ? ctaBackgroundColor : undefined,
        ctaButtonStyle: isCtaApplicable ? ctaButtonStyle : undefined,
        ctaButtonSize: isCtaApplicable ? ctaButtonSize : undefined,
        ctaButtonPlacement: isCtaApplicable ? ctaButtonPlacement : undefined,
        startDateTime: new Date(`${startDate}T${startTime}:00`).toISOString(),
        endDateTime: new Date(`${endDate}T${endTime}:00`).toISOString(),
        placement: AdPlacement.DASHBOARD_BANNER,
        priority: parseInt(priority) || 0,
        status: targetStatus || status,
        displayType: adType === "card" ? AdDisplayType.CARD : AdDisplayType.BANNER,
        media: media.length > 0 ? media : undefined,
        // Targeting
        countryIds: countryId ? [countryId] : [],
        stateIds,
        cityIds,
        skillIds,
        experienceLevelIds: experienceIds,
        educationLevelIds: educationIds,
        specializationIds,
        yearOfPassing: yearOfPassing || undefined,
      };

      if (adId) {
        await advertisementsApi.update(adId, payload as any);
        toast.success("Advertisement updated successfully!");
        navigate("/ads");
      } else {
        await advertisementsApi.create(payload as any);
        const finalStatus = targetStatus || status;
        toast.success(`Advertisement ${finalStatus === AdStatus.DRAFT ? "saved as draft" : "published"} successfully!`);
        navigate("/ads");
      }
    } catch (error: unknown) {
      toast.dismiss("upload-progress");
      console.error("Failed to save advertisement:", error);
      toast.error(getApiErrorMessage(error, "Failed to save advertisement."));
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold">Advertisement Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-2">
            <Label htmlFor="ad-title">
              Ad Title
              <RequiredMark />
            </Label>
            <Input
              id="ad-title"
              placeholder="Healthcare Career Summit 2026"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                clearFieldError("title");
              }}
              className={cn("bg-muted/30", fieldErrors.title && "border-destructive")}
              disabled={isReadOnly}
            />
            {fieldErrors.title && (
              <p className="text-xs text-destructive">{fieldErrors.title}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label>
              Ad Type
              <RequiredMark />
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => !isReadOnly && setAdType("banner")}
                disabled={isReadOnly}
                className={cn(
                  "flex flex-col items-center gap-3 rounded-xl border p-4 transition-all hover:bg-muted",
                  adType === "banner" ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border",
                  isReadOnly && "cursor-not-allowed opacity-70"
                )}
              >
                <div className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full",
                  adType === "banner" ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                )}>
                  <ImageIcon className="h-5 w-5" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold">Banner</p>
                  <p className="text-[10px] text-muted-foreground">Standard feed banner</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => !isReadOnly && setAdType("card")}
                disabled={isReadOnly}
                className={cn(
                  "flex flex-col items-center gap-3 rounded-xl border p-4 transition-all hover:bg-muted",
                  adType === "card" ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border",
                  isReadOnly && "cursor-not-allowed opacity-70"
                )}
              >
                <div className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full",
                  adType === "card" ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                )}>
                  <Plus className="h-5 w-5" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold">Card</p>
                  <p className="text-[10px] text-muted-foreground">Fullscreen / In-feed card</p>
                </div>
              </button>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>
              Format
              <RequiredMark />
            </Label>
            <RadioGroup
              value={format}
              onValueChange={(v) => {
                setFormat(v as AdvertisementContentFormat);
                setFieldErrors((prev) => {
                  const next = { ...prev };
                  delete next.media;
                  delete next.htmlContent;
                  delete next.youtubeUrl;
                  return next;
                });
              }}
              className="flex flex-wrap gap-6"
              disabled={isReadOnly}
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="default" id="fmt-default" />
                <Label htmlFor="fmt-default" className="font-normal">
                  Default
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="html" id="fmt-html" />
                <Label htmlFor="fmt-html" className="font-normal">
                  HTML
                </Label>
              </div>
              {
                adType === "card" && (
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="youtube" id="fmt-youtube" />
                    <Label htmlFor="fmt-youtube" className="font-normal">
                      YouTube
                    </Label>
                  </div>
                )
              }
            </RadioGroup>
          </div>

          {/* Conditional Format Editors */}
          {format === "html" && (
            <div className="rounded-lg border border-border bg-card p-4">
              <HtmlEditor value={htmlContent} onChange={(value) => {
                setHtmlContent(value);
                clearFieldError("htmlContent");
              }} adType={adType} disabled={isReadOnly} />
              {fieldErrors.htmlContent && (
                <p className="mt-2 text-xs text-destructive">{fieldErrors.htmlContent}</p>
              )}
            </div>
          )}

          {format === "youtube" && (
            <div className="rounded-lg border border-border bg-card p-4">
              <YoutubeUrlInput value={youtubeUrl} onChange={(value) => {
                setYoutubeUrl(value);
                clearFieldError("youtubeUrl");
              }} disabled={isReadOnly} />
              {fieldErrors.youtubeUrl && (
                <p className="mt-2 text-xs text-destructive">{fieldErrors.youtubeUrl}</p>
              )}
            </div>
          )}

          {
            (format === "default" || format === "html") && (
              <div className="grid gap-2">
                <Label htmlFor="redirect-url">
                  Redirect URL / CTA Link
                  <RequiredMark />
                </Label>
                <Input
                  id="redirect-url"
                  placeholder="https://www.example.com"
                  value={redirectUrl}
                  onChange={(e) => {
                    setRedirectUrl(e.target.value);
                    clearFieldError("redirectUrl");
                  }}
                  className={cn("bg-muted/30", fieldErrors.redirectUrl && "border-destructive")}
                  disabled={isReadOnly}
                />
                {fieldErrors.redirectUrl && (
                  <p className="text-xs text-destructive">{fieldErrors.redirectUrl}</p>
                )}
              </div>
            )
          }

          {showCtaField && adType !== 'banner' && format === 'default' && (
            <div className="grid gap-2">
              <Label htmlFor="cta-text">CTA Button Text</Label>
              <Input
                id="cta-text"
                placeholder="Apply Now, Learn More, Register, etc."
                value={ctaText}
                onChange={(e) => setCtaText(e.target.value)}
                className="bg-muted/30"
                disabled={isReadOnly}
              />
            </div>
          )}

          {showCtaField && adType !== 'banner' && format === 'default' && (
            <div className="space-y-4 rounded-lg border border-border bg-muted/20 p-4">
              <p className="text-sm font-medium">CTA Button Customization</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="cta-text-color">CTA Text Color</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="cta-text-color-picker"
                      type="color"
                      value={ctaTextColor}
                      onChange={(e) => setCtaTextColor(e.target.value)}
                      className="h-10 w-14 cursor-pointer p-1"
                      disabled={isReadOnly}
                    />
                    <Input
                      id="cta-text-color"
                      value={ctaTextColor}
                      onChange={(e) => setCtaTextColor(e.target.value)}
                      placeholder="#000000"
                      className="bg-muted/30 font-mono uppercase"
                      disabled={isReadOnly}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="cta-background-color">CTA Background Color</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="cta-background-color-picker"
                      type="color"
                      value={ctaBackgroundColor}
                      onChange={(e) => setCtaBackgroundColor(e.target.value)}
                      className="h-10 w-14 cursor-pointer p-1"
                      disabled={isReadOnly}
                    />
                    <Input
                      id="cta-background-color"
                      value={ctaBackgroundColor}
                      onChange={(e) => setCtaBackgroundColor(e.target.value)}
                      placeholder="#f9c20a"
                      className="bg-muted/30 font-mono uppercase"
                      disabled={isReadOnly}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="cta-button-style">CTA Button Style</Label>
                  <Select
                    value={ctaButtonStyle}
                    onValueChange={(v) => setCtaButtonStyle(v as AdCtaButtonStyle)}
                    disabled={isReadOnly}
                  >
                    <SelectTrigger id="cta-button-style" className="bg-muted/30">
                      <SelectValue placeholder="Select style" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={AdCtaButtonStyle.FILLED}>Filled</SelectItem>
                      <SelectItem value={AdCtaButtonStyle.OUTLINE}>Outline</SelectItem>
                      <SelectItem value={AdCtaButtonStyle.GHOST}>Ghost</SelectItem>
                      <SelectItem value={AdCtaButtonStyle.TEXT}>Text</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="cta-button-size">CTA Button Size</Label>
                  <Select
                    value={ctaButtonSize}
                    onValueChange={(v) => setCtaButtonSize(v as AdCtaButtonSize)}
                    disabled={isReadOnly}
                  >
                    <SelectTrigger id="cta-button-size" className="bg-muted/30">
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={AdCtaButtonSize.SMALL}>Small</SelectItem>
                      <SelectItem value={AdCtaButtonSize.MEDIUM}>Medium</SelectItem>
                      <SelectItem value={AdCtaButtonSize.LARGE}>Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="cta-button-placement">CTA Button Placement</Label>
                  <Select
                    value={ctaButtonPlacement}
                    onValueChange={(v) => setCtaButtonPlacement(v as AdCtaButtonPlacement)}
                    disabled={isReadOnly}
                  >
                    <SelectTrigger id="cta-button-placement" className="bg-muted/30">
                      <SelectValue placeholder="Select placement" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={AdCtaButtonPlacement.BOTTOM_LEFT}>Bottom Left</SelectItem>
                      <SelectItem value={AdCtaButtonPlacement.BOTTOM_CENTER}>Bottom Center</SelectItem>
                      <SelectItem value={AdCtaButtonPlacement.BOTTOM_RIGHT}>Bottom Right</SelectItem>
                      <SelectItem value={AdCtaButtonPlacement.TOP_LEFT}>Top Left</SelectItem>
                      <SelectItem value={AdCtaButtonPlacement.TOP_CENTER}>Top Center</SelectItem>
                      <SelectItem value={AdCtaButtonPlacement.TOP_RIGHT}>Top Right</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {
            adType !== 'banner' && (
              <div className="grid gap-2">
                <Label htmlFor="priority">
                  Priority / Display Order
                  <RequiredMark />
                </Label>
                <Input
                  id="priority"
                  type="number"
                  min={0}
                  defaultValue={4}
                  placeholder="4"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="bg-muted/30"
                  disabled={isReadOnly}
                />
              </div>
            )
          }

          <div className="grid gap-2">
            <Label>
              Status
              <RequiredMark />
            </Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as AdStatus)}
              disabled={isReadOnly}
            >
              <SelectTrigger className="bg-muted/30">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={AdStatus.ACTIVE}>Active</SelectItem>
                <SelectItem value={AdStatus.DRAFT}>Draft</SelectItem>
                <SelectItem value={AdStatus.INACTIVE}>Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {fieldErrors.schedule && (
              <p className="text-xs text-destructive sm:col-span-2">{fieldErrors.schedule}</p>
            )}
            <div className="grid gap-2">
              <Label htmlFor="start-date">
                Start Date
                <RequiredMark />
              </Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  clearFieldError("schedule");
                  clearFieldError("startDateTime");
                  clearFieldError("endDateTime");
                }}
                className={cn("bg-muted/30", (fieldErrors.schedule || fieldErrors.startDateTime) && "border-destructive")}
                disabled={isReadOnly}
              />
              {fieldErrors.startDateTime && (
                <p className="text-xs text-destructive">{fieldErrors.startDateTime}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="start-time">
                Start Time
                <RequiredMark />
              </Label>
              <Input
                id="start-time"
                type="time"
                value={startTime}
                onChange={(e) => {
                  setStartTime(e.target.value);
                  clearFieldError("schedule");
                  clearFieldError("startDateTime");
                  clearFieldError("endDateTime");
                }}
                className={cn("bg-muted/30", (fieldErrors.schedule || fieldErrors.startDateTime) && "border-destructive")}
                disabled={isReadOnly}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="end-date">
                End Date
                <RequiredMark />
              </Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                min={startDate || new Date().toISOString().split('T')[0]}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  clearFieldError("schedule");
                  clearFieldError("endDateTime");
                }}
                className={cn("bg-muted/30", (fieldErrors.schedule || fieldErrors.endDateTime) && "border-destructive")}
                disabled={isReadOnly}
              />
              {fieldErrors.endDateTime && (
                <p className="text-xs text-destructive">{fieldErrors.endDateTime}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="end-time">
                End Time
                <RequiredMark />
              </Label>
              <Input
                id="end-time"
                type="time"
                value={endTime}
                onChange={(e) => {
                  setEndTime(e.target.value);
                  clearFieldError("schedule");
                  clearFieldError("endDateTime");
                }}
                className={cn("bg-muted/30", (fieldErrors.schedule || fieldErrors.endDateTime) && "border-destructive")}
                disabled={isReadOnly}
              />
            </div>
          </div>

          <div className="grid gap-2">
            {
              format === "default" && (
                <>
                  <Label>
                    {allowMultipleFiles ? "Upload Images" : "Upload Image"}
                    <RequiredMark />
                  </Label>
                </>
              )
            }
            {format === "default" && !isReadOnly && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={onDrop}
                className={cn(
                  "flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border bg-white px-4 py-8 text-center transition-colors hover:bg-muted/30",
                  fieldErrors.media && "border-destructive bg-destructive/5",
                )}
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-muted/50">
                  <CloudUpload className="h-5 w-5 text-foreground" />
                </div>
                <p className="text-sm text-foreground">
                  <span className="text-primary hover:underline">Click to upload</span> or drag and drop
                </p>
                <p className="mt-1 max-w-md text-xs text-muted-foreground">
                  Upload images in GIF, JPG, or PNG format. Maximum file size: {MAX_UPLOAD_MB}MB.
                </p>
                <p className="mt-2 text-[10px] font-medium text-primary uppercase tracking-wider">
                  Required: {adType === 'banner' ? '16:9 Aspect Ratio (e.g. 1920x1080px)' : '9:16 Aspect Ratio (e.g. 1080x1920px)'}
                </p>
              </button>
            )}
            {fieldErrors.media && (
              <p className="text-xs text-destructive">{fieldErrors.media}</p>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT_TYPES}
              multiple={allowMultipleFiles}
              className="hidden"
              onChange={onFileInputChange}
              disabled={isReadOnly}
            />
            {format === "default" && mediaItems.length > 0 && (
              <ul className="space-y-3 pt-4">
                {mediaItems.map((item, index) => (
                  <li
                    key={item.id}
                    draggable={allowMultipleFiles && !isReadOnly}
                    onDragStart={(e) => !isReadOnly && handleDragStart(e, index)}
                    onDragOver={(e) => !isReadOnly && handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    onDrop={(e) => !isReadOnly && handleDrop(e, index)}
                    className={cn(
                      "flex items-center gap-3 transition-opacity",
                      draggedIndex === index ? "opacity-50" : "opacity-100"
                    )}
                  >
                    <div className="flex flex-1 items-center justify-between gap-3 rounded-lg border border-border bg-white px-4 py-3 shadow-sm">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-blue-50 text-blue-500">
                          <ImageIcon className="h-5 w-5 fill-current opacity-80" />
                        </div>
                        <span className="truncate text-sm font-medium text-foreground">
                          {item.type === 'NEW' ? item.file.name : (item.url.split('/').pop() || 'Existing Image')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.type === 'EXISTING' && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => window.open(item.url, '_blank')}
                            aria-label="Preview image"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        {!isReadOnly && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => removeMediaAt(index)}
                            aria-label="Remove image"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    {allowMultipleFiles && !isReadOnly && (
                      <div className="flex h-10 w-8 shrink-0 cursor-grab items-center justify-center text-primary active:cursor-grabbing">
                        <Menu className="h-5 w-5" />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold">Tags</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <MultiSelectDropdown
                label="Country"
                placeholder="Select country"
                options={countryDropdownOptions}
                selected={countryId ? [countryId] : []}
                onChange={(ids) => {
                  const nextCountryId = ids.find((id) => id !== countryId) ?? ids[ids.length - 1] ?? "";
                  setCountryId(nextCountryId);
                  setStateIds([]);
                  setCityIds([]);
                }}
                disabled={isReadOnly}
                isLoading={countriesLoading || countrySearchLoading}
                onSearch={(value) =>
                  setLocationSearch((prev) => ({ ...prev, country: value }))
                }
              />
            </div>
            <MultiSelectDropdown
              label="State"
              placeholder="Select states..."
              options={stateDropdownOptions}
              selected={stateIds}
              onChange={(ids) => {
                setStateIds(ids);
                // Filter cityIds that are no longer valid for selected states
                const validStateIds = new Set(ids);
                setCityIds(cityIds.filter(cid => {
                  const city = cityOptionsSource.find(c => c.id === cid);
                  return city && validStateIds.has(city.parentId!);
                }));
              }}
              disabled={!countryId || isReadOnly}
              isLoading={statesLoading || stateSearchLoading}
              onSearch={(value) =>
                setLocationSearch((prev) => ({ ...prev, state: value }))
              }
            />
            <MultiSelectDropdown
              label="City"
              placeholder="Select cities..."
              options={cityDropdownOptions}
              selected={cityIds}
              onChange={setCityIds}
              disabled={stateIds?.length === 0 || isReadOnly}
              isLoading={citiesLoading || citySearchLoading}
              onSearch={(value) =>
                setLocationSearch((prev) => ({ ...prev, city: value }))
              }
            />
            <MultiSelectDropdown
              label="Skills"
              placeholder="Type to search skills."
              options={skillDropdownOptions}
              selected={skillIds}
              onChange={(ids) => {
                setSkillIds(ids);
                setSelectedSkillOptions(
                  ids
                    .map((id) => skillDropdownOptions.find((option) => option.id === id))
                    .filter((option): option is SelectOption => Boolean(option)),
                );
              }}
              disabled={isReadOnly}
              isLoading={skillSearchLoading}
              onSearch={setSkillSearch}
            />
            <MultiSelectDropdown
              label="Experience Level"
              placeholder="Type to search experience levels."
              options={experienceDropdownOptions}
              selected={experienceIds}
              onChange={(ids) => {
                setExperienceIds(ids);
                setSelectedExperienceOptions(
                  ids
                    .map((id) => experienceDropdownOptions.find((option) => option.id === id))
                    .filter((option): option is SelectOption => Boolean(option)),
                );
              }}
              disabled={isReadOnly}
              isLoading={experienceSearchLoading}
              onSearch={setExperienceSearch}
            />
            <MultiSelectDropdown
              label="Education"
              placeholder="Type to search qualifications."
              options={educationDropdownOptions}
              selected={educationIds}
              onChange={(ids) => {
                setEducationIds(ids);
                setSelectedEducationOptions(
                  ids
                    .map((id) => educationDropdownOptions.find((option) => option.id === id))
                    .filter((option): option is SelectOption => Boolean(option)),
                );
                // Clear specializations when education changes (orphan removal handled by useEffect)
              }}
              disabled={isReadOnly}
              isLoading={educationSearchLoading}
              onSearch={setEducationSearch}
            />
            <MultiSelectDropdown
              label="Specialization"
              placeholder={
                educationIds.length
                  ? 'Type to search specializations.'
                  : 'Select education first'
              }
              options={specializationDropdownOptions}
              selected={specializationIds}
              onChange={(ids) => {
                setSpecializationIds(ids);
                setSelectedSpecializationOptions(
                  ids
                    .map((id) => specializationDropdownOptions.find((option) => option.id === id))
                    .filter((option): option is SelectOption => Boolean(option)),
                );
              }}
              disabled={isReadOnly || educationIds.length === 0}
              isLoading={specializationSearchLoading || specializationsByEducationLoading}
              onSearch={setSpecializationSearch}
            />
            <MultiSelect
              label="Year of Passing"
              placeholder="Select years"
              items={yearItems}
              selectedIds={yearOfPassing}
              onChange={setYearOfPassing}
              disabled={isReadOnly}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-6">
        <Button type="button" variant="outline" onClick={onCancel}>
          {isReadOnly ? "Close" : "Cancel"}
        </Button>
        {!isReadOnly && (
          <>
            <Button type="button" onClick={() => handleSave()}>
              {adId ? "Update Advertisement" : "Save Advertisement"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
