import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { ChevronLeft, Download, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { applicationsApi, jobsApi, eventsApi, masterDataApi } from "@/api/services";
import { JobApplicationsTable } from "./components/JobApplicationsTable";
import { UserProfileFilterPanel, emptyUserProfileFilters, type UserProfileFilters } from "@/components/UserProfileFilterPanel";
import { useMasterData } from "@/hooks/useMasterData";
import { toast } from "sonner";
import { getHighestQualifications, getYearsOfPassing } from "@/utils/education";

function buildFilterParams(id: string, filters: UserProfileFilters, overrides?: { page?: number; limit?: number }, specializationIds?: string[]) {
  return {
    page: overrides?.page ?? 1,
    limit: overrides?.limit ?? 20,
    startDate: filters.startDate ? new Date(filters.startDate).toISOString() : undefined,
    endDate: filters.endDate ? new Date(filters.endDate).toISOString() : undefined,
    countryIds: filters.countryIds.length ? filters.countryIds : undefined,
    stateIds: filters.stateIds.length ? filters.stateIds : undefined,
    cityIds: filters.cityIds.length ? filters.cityIds : undefined,
    skillIds: filters.skillIds.length ? filters.skillIds : undefined,
    experienceLevelIds: filters.experienceLevelIds.length ? filters.experienceLevelIds : undefined,
    educationLevelIds: filters.educationLevelIds.length ? filters.educationLevelIds : undefined,
    years: filters.years.length ? filters.years : undefined,
    specializationIds: specializationIds?.length ? specializationIds : undefined,
  };
}

const esc = (v: unknown): string => {
  const s = v == null ? "" : String(v).trim();
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export default function JobApplicationsPage() {
  const { id, employerId } = useParams<{ id: string; employerId?: string }>();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const limit = 20;

  const [filters, setFilters] = useState<UserProfileFilters>(emptyUserProfileFilters);
  const [specializationResults, setSpecializationResults] = useState<{ id: string; value: string }[]>([]);
  const [specializationLabels, setSpecializationLabels] = useState<Record<string, string>>({});
  const [selectedSpecializationIds, setSelectedSpecializationIds] = useState<string[]>([]);
  const [pendingSpecializationIds, setPendingSpecializationIds] = useState<string[]>([]);

  // Pending selections from the filter panel (follow user selections before Apply)
  const [pendingCountryIds, setPendingCountryIds] = useState<string[]>(filters.countryIds);
  const [pendingStateIds, setPendingStateIds] = useState<string[]>(filters.stateIds);

  // Master data — shared with table (React Query deduplicates fetches)
  const { data: cities = [] } = useMasterData("LOCATION_CITY");
  const { data: states = [] } = useMasterData("LOCATION_STATE");
  const { data: countries = [] } = useMasterData("LOCATION_COUNTRY");
  const { data: skills = [] } = useMasterData("SKILL");
  const { data: expLevels = [] } = useMasterData("EXPERIENCE_LEVEL");
  const { data: eduLevels = [] } = useMasterData("EDUCATION_LEVEL");

  const cityMap    = useMemo(() => new Map(cities.map((c: any) => [c.id, c.value])), [cities]);
  const stateMap   = useMemo(() => new Map(states.map((s: any) => [s.id, s.value])), [states]);
  const countryMap = useMemo(() => new Map(countries.map((c: any) => [c.id, c.value])), [countries]);
  const skillMap   = useMemo(() => new Map(skills.map((s: any) => [s.id, s.value])), [skills]);
  const expMap     = useMemo(() => new Map(expLevels.map((e: any) => [e.id, e.value])), [expLevels]);
  const eduMap     = useMemo(() => new Map(eduLevels.map((e: any) => [e.id, e.value])), [eduLevels]);

  const { data: job } = useQuery({
    queryKey: ["job", id],
    queryFn: () => jobsApi.getOne(id!),
    enabled: !!id,
  });

  // --- Dependent Country -> State -> City loading for filter panel ---
  const { data: countriesForFilter = [] } = useQuery({
    queryKey: ['countries-for-filter'],
    queryFn: eventsApi.getCountries,
    staleTime: 5 * 60 * 1000,
  });

  const { data: statesForFilter = [] } = useQuery({
    queryKey: ['states-for-filter', pendingCountryIds],
    queryFn: async () => {
      if (!pendingCountryIds?.length) return [];

      const countrySlugs = pendingCountryIds
        .map((cid) => countriesForFilter.find((c: any) => c.id === cid)?.slug)
        .filter((s): s is string => Boolean(s));

      if (!countrySlugs.length) return [];

      const results = await Promise.all(countrySlugs.map((slug) => eventsApi.getStatesByCountrySlug(slug)));
      return results.flat();
    },
    enabled: pendingCountryIds.length > 0 && countriesForFilter.length > 0,
    keepPreviousData: true,
    staleTime: 5 * 60 * 1000,
  });

  const { data: citiesForFilter = [] } = useQuery({
    queryKey: ['cities-for-filter', pendingStateIds],
    queryFn: async () => {
      if (!pendingStateIds?.length) return [];

      const allResults: any[] = [];
      for (const stateId of pendingStateIds) {
        const state = statesForFilter.find((s: any) => s.id === stateId) || states.find((s: any) => s.id === stateId);
        if (!state?.slug) continue;
        const stateCities = await eventsApi.getCitiesByStateSlug(state.slug);
        allResults.push(...stateCities);
      }
      return allResults;
    },
    enabled: pendingStateIds.length > 0 && (statesForFilter.length > 0 || states.length > 0),
    keepPreviousData: true,
    staleTime: 5 * 60 * 1000,
  });

  const { data: applicantsData, isLoading } = useQuery({
    queryKey: ["job-applications", id, page, limit, filters, selectedSpecializationIds],
    queryFn: () => applicationsApi.adminListByJob(id!, buildFilterParams(id!, filters, { page, limit }, selectedSpecializationIds)),
    enabled: !!id,
  });
  const [pendingEducationIds, setPendingEducationIds] = useState<string[]>([]);

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
    pendingSpecializationIds.forEach((id) => {
      if (!resultMap.has(id) && specializationLabels[id]) {
        resultMap.set(id, { id, value: specializationLabels[id] });
      }
    });
    return Array.from(resultMap.values());
  }, [specializationResults, pendingSpecializationIds, specializationLabels]);

  const handleFiltersApply = (newFilters: UserProfileFilters) => {
    setFilters(newFilters);
    setSelectedSpecializationIds(pendingSpecializationIds);
    setPage(1);
    setPendingCountryIds(newFilters.countryIds ?? []);
    setPendingStateIds(newFilters.stateIds ?? []);
  };

  const handleExportCsv = async () => {
    if (!id) return;
    setExporting(true);
    try {
     const result = await applicationsApi.adminListByJob(id, buildFilterParams(id, filters, { page: 1, limit: 100000 }, selectedSpecializationIds));
      const rows = result.data ?? [];

      if (!rows.length) {
        toast.error("No applicants to export.");
        return;
      }

      const header = [
        "Name", "Email", "Mobile Number",
        "City", "State", "Country",
        "Skills", "Experience Level", "Education", "Specialization", "Year of Passing",
        "Status", "Applied At",
      ];

      const csvRows = [
        header.join(","),
        ...rows.map((row) => {
          const user = row.user ?? {};
          const skillIds = (user.skills ?? []).map((s: any) => s.masterDataId).filter(Boolean) as string[];
          const skillNames = skillIds.map((sid) => skillMap.get(sid)).filter(Boolean).join("; ");
          const yearOfPassing = getYearsOfPassing(user, "csv");
          const specializations = (user.education ?? [])
            .map((e: any) => e.specialization)
            .filter(Boolean)
            .join(", ");

          return [
            esc(user.fullName),
            esc(user.email),
            esc(user.mobileNumber),
            esc(user.currentCityId ? cityMap.get(user.currentCityId) : ""),
            esc(user.stateId ? stateMap.get(user.stateId) : ""),
            esc(user.countryId ? countryMap.get(user.countryId) : ""),
            esc(skillNames),
            esc(user.experienceLevelId ? expMap.get(user.experienceLevelId) : ""),
            esc(getHighestQualifications(user, eduMap, "csv")),
            esc(specializations),
            esc(yearOfPassing),
            esc(row.status),
            esc(row.appliedAt ? new Date(row.appliedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : ""),
          ].join(",");
        }),
      ];

      const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `applicants-${id}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to export CSV. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const backPath = employerId ? `/employers/${employerId}` : "/jobs";
  const jobTitle = (job as any)?.title || (job as any)?.data?.title || "Job Applicants";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(backPath)}
            className="h-9 w-9 rounded-full border border-border"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-semibold text-foreground">{jobTitle}</h2>
            <p className="text-sm text-muted-foreground">
              Review applicant details for this job posting.
            </p>
          </div>
        </div>
        <Button variant="outline" className="gap-2" onClick={handleExportCsv} disabled={exporting}>
          <Download className="h-4 w-4" />
          {exporting ? "Exporting…" : "Download CSV"}
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
          onApply={handleFiltersApply}
          labels={{
            dateRange: 'Apply Date',
            skills: 'Skill',
            experienceLevel: 'Experience Level',
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
            values.forEach((id) => {
              const opt = specializationOptions.find((o) => o.id === id);
              if (opt) next[id] = opt.value;
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

      <JobApplicationsTable
        rows={applicantsData?.data ?? []}
        loading={isLoading}
        search={search}
        page={page}
        limit={limit}
        total={applicantsData?.total ?? 0}
        onPageChange={setPage}
      />
    </div>
  );
}
