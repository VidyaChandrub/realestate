import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { ChevronLeft, Download, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { advertisementsApi } from "@/api/advertisements";
import { eventsApi } from "@/api/services";
import { AdvertisementClicksTable } from "../components/AdvertisementClicksTable";
import { UserProfileFilterPanel, emptyUserProfileFilters, type UserProfileFilters } from "@/components/UserProfileFilterPanel";
import type { MasterDataItem } from "@/types";

export default function AdvertisementClicksPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;

  const [filters, setFilters] = useState<UserProfileFilters>(emptyUserProfileFilters);
  const [pendingCountryIds, setPendingCountryIds] = useState<string[]>(filters.countryIds);
  const [pendingStateIds, setPendingStateIds] = useState<string[]>(filters.stateIds);
  const [specializationResults, setSpecializationResults] = useState<{ id: string; value: string }[]>([]);
  const [specializationLabels, setSpecializationLabels] = useState<Record<string, string>>({});
  const [selectedSpecializationIds, setSelectedSpecializationIds] = useState<string[]>([]);
  const [pendingSpecializationIds, setPendingSpecializationIds] = useState<string[]>([]);
  const [pendingEducationIds, setPendingEducationIds] = useState<string[]>([]);

  const { data: ad } = useQuery({
    queryKey: ["advertisement", id],
    queryFn: () => advertisementsApi.getOne(id!),
    enabled: !!id,
  });

  const { data: countriesForFilter = [] } = useQuery<MasterDataItem[]>({
    queryKey: ["countries-for-filter"],
    queryFn: eventsApi.getCountries,
    staleTime: 5 * 60 * 1000,
  });

  const { data: statesForFilter = [] } = useQuery<MasterDataItem[]>({
    queryKey: ["states-for-filter", pendingCountryIds],
    queryFn: async () => {
      if (!pendingCountryIds.length) return [];

      const countrySlugs = pendingCountryIds
        .map((cid) => countriesForFilter.find((c) => c.id === cid)?.slug)
        .filter((slug): slug is string => Boolean(slug));

      if (!countrySlugs.length) return [];

      const results = await Promise.all(countrySlugs.map((slug) => eventsApi.getStatesByCountrySlug(slug)));
      return results.flat();
    },
    enabled: pendingCountryIds.length > 0 && countriesForFilter.length > 0,
    keepPreviousData: true,
    staleTime: 5 * 60 * 1000,
  });

  const { data: citiesForFilter = [] } = useQuery<MasterDataItem[]>({
    queryKey: ["cities-for-filter", pendingStateIds],
    queryFn: async () => {
      if (!pendingStateIds.length) return [];

      const results: MasterDataItem[] = [];
      for (const stateId of pendingStateIds) {
        const state = statesForFilter.find((s) => s.id === stateId);
        if (!state?.slug) continue;
        const stateCities = await eventsApi.getCitiesByStateSlug(state.slug);
        results.push(...stateCities);
      }
      return results;
    },
    enabled: pendingStateIds.length > 0 && statesForFilter.length > 0,
    keepPreviousData: true,
    staleTime: 5 * 60 * 1000,
  });

const handleSpecializationSearch = useMemo(
    () => {
      let timer: ReturnType<typeof setTimeout>;
      return (value: string) => {
        clearTimeout(timer);
        timer = setTimeout(async () => {
          if (!value?.trim() || !pendingEducationIds.length) {
            setSpecializationResults([]);
            return;
          }
          try {
            const results = await Promise.all(
              pendingEducationIds.map((educationId) =>
                eventsApi.getSpecializationsByEducationId(educationId)
              )
            );
            const allSpecs = results.flat() as { id: string; value: string }[];
            const query = value.trim().toLowerCase();
            const filtered = allSpecs.filter((item) =>
              item.value?.toLowerCase().includes(query)
            );
            setSpecializationResults(filtered);
          } catch {
            setSpecializationResults([]);
          }
        }, 300);
      };
    },
    [pendingEducationIds],
  );

  const specializationOptions = useMemo(() => {
    const resultMap = new Map(specializationResults.map((item) => [item.id, item]));
    pendingSpecializationIds.forEach((sid) => {
      if (!resultMap.has(sid) && specializationLabels[sid]) {
        resultMap.set(sid, { id: sid, value: specializationLabels[sid] });
      }
    });
    return Array.from(resultMap.values());
  }, [specializationResults, pendingSpecializationIds, specializationLabels]);

  const { data: clicksData, isLoading } = useQuery({
    queryKey: ["advertisement-clicks", id, page, limit, filters, selectedSpecializationIds],
    queryFn: () =>
      advertisementsApi.getClicks(id!, {
        page,
        limit,
        ...filters,
        startDate: filters.startDate ? new Date(filters.startDate).toISOString() : undefined,
        endDate: filters.endDate ? new Date(new Date(filters.endDate).setHours(23, 59, 59, 999)).toISOString() : undefined,
        specializationIds: selectedSpecializationIds.length ? selectedSpecializationIds : undefined,
      }),
    enabled: !!id,
  });

  const handleExport = async () => {
    if (!id) return;
    try {
      const blob = await advertisementsApi.exportClicks(id, {
        ...filters,
        startDate: filters.startDate ? new Date(filters.startDate).toISOString() : undefined,
        endDate: filters.endDate ? new Date(new Date(filters.endDate).setHours(23, 59, 59, 999)).toISOString() : undefined,
        specializationIds: selectedSpecializationIds.length ? selectedSpecializationIds : undefined,
      });
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `clicks-${id}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Export failed", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/ads")}
            className="h-9 w-9 rounded-full border border-border"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-semibold text-foreground">
              {ad?.title || "Advertisement Clicks"}
            </h2>
            <p className="text-sm text-muted-foreground">
              Review registration details for this Ads and export the list as CSV.
            </p>
          </div>
        </div>
        <Button variant="outline" className="gap-2" onClick={handleExport}>
          <Download className="h-4 w-4" />
          CSV
        </Button>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            placeholder="Search by name, email or mobile..."
          />
        </div>
        <UserProfileFilterPanel
          filters={filters}
          onApply={(newFilters) => {
            setFilters(newFilters);
            setSelectedSpecializationIds(pendingSpecializationIds);
            setPage(1);
            setPendingCountryIds(newFilters.countryIds ?? []);
            setPendingStateIds(newFilters.stateIds ?? []);
          }}
          searchFirstLargeFilters
          countries={countriesForFilter}
          states={statesForFilter}
          cities={citiesForFilter}
          onCountriesChange={(ids) => setPendingCountryIds(ids)}
          onStatesChange={(ids) => setPendingStateIds(ids)}
          specializationOptions={specializationOptions}
          selectedSpecializationIds={pendingSpecializationIds}
          onSpecializationChange={(values) => {
            setPendingSpecializationIds(values);
            const next = { ...specializationLabels };
            values.forEach((sid) => {
              const opt = specializationOptions.find((o) => o.id === sid);
              if (opt) next[sid] = opt.value;
            });
            setSpecializationLabels(next);
          }}
          onSpecializationSearch={handleSpecializationSearch}
          onEducationChange={(ids) => {
            setPendingEducationIds(ids);
            if (!ids.length) {
              setPendingSpecializationIds([]);
              setSpecializationResults([]);
            }
          }}
        />
      </div>

      <AdvertisementClicksTable
        rows={clicksData || []}
        loading={isLoading}
        search={search}
      />
    </div>
  );
}
