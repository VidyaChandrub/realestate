import { useState, useEffect } from "react";
import type { AdvertisementAdType, AdvertisementContentFormat } from "../types/ad-form";
import { AdStatus, AdCtaButtonStyle, AdCtaButtonSize, AdCtaButtonPlacement } from "@/types";

export type AdvertisementMediaItem = 
  | { id: string; type: 'EXISTING'; url: string }
  | { id: string; type: 'NEW'; file: File };

export interface UseAdvertisementFormState {
  // Basic info
  adType: AdvertisementAdType;
  setAdType: (type: AdvertisementAdType) => void;
  
  format: AdvertisementContentFormat;
  setFormat: (format: AdvertisementContentFormat) => void;
  
  title: string;
  setTitle: (title: string) => void;
  
  redirectUrl: string;
  setRedirectUrl: (url: string) => void;
  
  ctaText: string;
  setCtaText: (text: string) => void;

  ctaTextColor: string;
  setCtaTextColor: (color: string) => void;

  ctaBackgroundColor: string;
  setCtaBackgroundColor: (color: string) => void;

  ctaButtonStyle: AdCtaButtonStyle;
  setCtaButtonStyle: (style: AdCtaButtonStyle) => void;

  ctaButtonSize: AdCtaButtonSize;
  setCtaButtonSize: (size: AdCtaButtonSize) => void;

  ctaButtonPlacement: AdCtaButtonPlacement;
  setCtaButtonPlacement: (placement: AdCtaButtonPlacement) => void;
  
  status: AdStatus;
  setStatus: (status: AdStatus) => void;
  
  // Format-specific content
  htmlContent: string;
  setHtmlContent: (content: string) => void;
  
  youtubeUrl: string;
  setYoutubeUrl: (url: string) => void;
  
  // Media items for ordering
  mediaItems: AdvertisementMediaItem[];
  setMediaItems: (items: AdvertisementMediaItem[]) => void;
  previewUrls: string[];
  
  // Other fields
  priority: string;
  setPriority: (priority: string) => void;
  
  startDate: string;
  setStartDate: (date: string) => void;
  
  startTime: string;
  setStartTime: (time: string) => void;
  
  endDate: string;
  setEndDate: (date: string) => void;
  
  endTime: string;
  setEndTime: (time: string) => void;
  
  countryId: string;
  setCountryId: (id: string) => void;
  
  stateIds: string[];
  setStateIds: (ids: string[]) => void;
  
  cityIds: string[];
  setCityIds: (ids: string[]) => void;
  
  rawLocationIds: string[];
  setRawLocationIds: (ids: string[]) => void;
  
  skillIds: string[];
  setSkillIds: (ids: string[]) => void;
  
  experienceIds: string[];
  setExperienceIds: (ids: string[]) => void;
  
  educationIds: string[];
  setEducationIds: (ids: string[]) => void;

  specializationIds: string[];
  setSpecializationIds: (ids: string[]) => void;

  selectedSpecializationOptions: { id: string; value: string; parentId?: string | null }[];
  setSelectedSpecializationOptions: (options: { id: string; value: string; parentId?: string | null }[]) => void;

  specializationSearch: string;
  setSpecializationSearch: (search: string) => void;

  yearOfPassing: string[];
  setYearOfPassing: (years: string[]) => void;

  resetWithData: (data: any) => void;
}

/**
 * Custom hook to manage advertisement form state
 * Provides centralized state management for form and preview components
 */
export function useAdvertisementFormState(): UseAdvertisementFormState {
  const [adType, setAdType] = useState<AdvertisementAdType>("banner");
  const [format, setFormat] = useState<AdvertisementContentFormat>("default");
  const [title, setTitle] = useState("");
  const [redirectUrl, setRedirectUrl] = useState("");
  const [ctaText, setCtaText] = useState("");
  const [ctaTextColor, setCtaTextColor] = useState("#000000");
  const [ctaBackgroundColor, setCtaBackgroundColor] = useState("#f9c20a");
  const [ctaButtonStyle, setCtaButtonStyle] = useState<AdCtaButtonStyle>(AdCtaButtonStyle.FILLED);
  const [ctaButtonSize, setCtaButtonSize] = useState<AdCtaButtonSize>(AdCtaButtonSize.MEDIUM);
  const [ctaButtonPlacement, setCtaButtonPlacement] = useState<AdCtaButtonPlacement>(AdCtaButtonPlacement.BOTTOM_LEFT);
  const [status, setStatus] = useState<AdStatus>(AdStatus.ACTIVE);
  const [htmlContent, setHtmlContent] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [mediaItems, setMediaItems] = useState<AdvertisementMediaItem[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  
  const [priority, setPriority] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  
  const [countryId, setCountryId] = useState("");
  const [stateIds, setStateIds] = useState<string[]>([]);
  const [cityIds, setCityIds] = useState<string[]>([]);
  const [rawLocationIds, setRawLocationIds] = useState<string[]>([]);
  const [skillIds, setSkillIds] = useState<string[]>([]);
  const [experienceIds, setExperienceIds] = useState<string[]>([]);
  const [educationIds, setEducationIds] = useState<string[]>([]);
  const [specializationIds, setSpecializationIds] = useState<string[]>([]);
  const [selectedSpecializationOptions, setSelectedSpecializationOptions] = useState<{ id: string; value: string; parentId?: string | null }[]>([]);
  const [specializationSearch, setSpecializationSearch] = useState("");
  const [yearOfPassing, setYearOfPassing] = useState<string[]>([]);

  // Generate preview URLs from mediaItems
  useEffect(() => {
    const objectUrls: string[] = [];
    const urls = mediaItems.map((item) => {
      if (item.type === 'EXISTING') return item.url;
      const url = URL.createObjectURL(item.file);
      objectUrls.push(url);
      return url;
    });
    setPreviewUrls(urls);

    return () => {
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [mediaItems]);

  return {
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
    yearOfPassing,
    setYearOfPassing,
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
    resetWithData: (data: any) => {
      setAdType(data.displayType === "CARD" ? "card" : "banner");
      setTitle(data.title || "");
      setRedirectUrl(data.redirectUrl || "");
      setCtaText(data.ctaText || "");
      setCtaTextColor(data.ctaTextColor || "#000000");
      setCtaBackgroundColor(data.ctaBackgroundColor || "#f9c20a");
      setCtaButtonStyle(data.ctaButtonStyle || AdCtaButtonStyle.FILLED);
      setCtaButtonSize(data.ctaButtonSize || AdCtaButtonSize.MEDIUM);
      setCtaButtonPlacement(data.ctaButtonPlacement || AdCtaButtonPlacement.BOTTOM_LEFT);
      setStatus(data.status || AdStatus.ACTIVE);
      setHtmlContent("");
      setYoutubeUrl("");
      setPriority(String(data.priority || 0));
      setYearOfPassing(data.yearOfPassing || []);
      
      if (data.startDateTime) {
        const start = new Date(data.startDateTime);
        setStartDate(start.toISOString().split("T")[0]);
        setStartTime(start.toTimeString().split(" ")[0].substring(0, 5));
      }
      
      if (data.endDateTime) {
        const end = new Date(data.endDateTime);
        setEndDate(end.toISOString().split("T")[0]);
        setEndTime(end.toTimeString().split(" ")[0].substring(0, 5));
      }

      const target = data.targeting && data.targeting.length > 0 ? data.targeting[0] : null;

      // Handle targeting location IDs — now stored separately
      if (target) {
        // countryId is a single value; take the first if present
        const cId = target.countryIds && target.countryIds.length > 0 ? target.countryIds[0] : '';
        setCountryId(cId);
        setStateIds(target.stateIds || []);
        setCityIds(target.cityIds || []);
      } else {
        setCountryId('');
        setStateIds([]);
        setCityIds([]);
      }
      setRawLocationIds([]);

      setSkillIds(target?.skillIds || data.skillIds || []);
      setExperienceIds(target?.experienceLevelIds || data.experienceLevelIds || []);
      setEducationIds(target?.educationLevelIds || data.educationLevelIds || []);
      const savedSpecializationIds = target?.specializationIds || data.specializationIds;
      setSpecializationIds(savedSpecializationIds ?? []);
      setSelectedSpecializationOptions([]);
      setSpecializationSearch("");
      setYearOfPassing(target?.yearOfPassing || data.yearOfPassing || []);
      if (data.media && data.media.length > 0) {
        const htmlMedia = data.media.find((m: any) => m.mediaType === 'HTML');
        if (htmlMedia) {
          setFormat("html");
          setHtmlContent(htmlMedia.mediaUrl);
        } else {
          const ytMedia = data.media.find((m: any) => m.mediaType === 'VIDEO');
          if (ytMedia) {
            setFormat("youtube");
            setYoutubeUrl(ytMedia.mediaUrl);
          } else {
            setFormat("default");
            const imageMedia = data.media.filter((m: any) => m.mediaType === 'IMAGE').sort((a: any, b: any) => a.order - b.order);
            if (imageMedia.length > 0) {
              const urls = imageMedia.map((m: any) => m.mediaUrl);
              setMediaItems(urls.map(url => ({ id: crypto.randomUUID(), type: 'EXISTING', url })));
              setPreviewUrls(urls);
            }
          }
        }
      }
    },
  };
}
