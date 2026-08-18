import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { Advertisement } from "@/types";
import { canManageAdvertisements } from "./constants/access-control";
import { AdvertisementsTable } from "./components/AdvertisementsTable";
import { advertisementsApi } from "@/api/advertisements";

export interface AdvertisementListItem {
  id: string;
  title: string;
  type: "Card" | "Banner";
  format: "default" | "html" | "youtube";
  status: string;
  clicks: number;
  startDate: string;
  endDate: string;
  createdAt: string;
}

const FALLBACK_TOTAL = 127;

function mapAdToListItem(ad: Advertisement): AdvertisementListItem {
  const isCompleted = new Date(ad.endDateTime) < new Date();
  const normalizedStatus = isCompleted ? 'completed' : ad.status.toLowerCase();
  
  // Determine format from media type
  let format: "default" | "html" | "youtube" = "default";
  if (ad.media && ad.media.length > 0) {
    const firstMedia = ad.media[0];
    if (firstMedia.mediaType === 'HTML') {
      format = "html";
    } else if (firstMedia.mediaType === 'VIDEO') {
      format = "youtube";
    }
  }
  
  return {
    id: ad.id,
    title: ad.title,
    type: ad.displayType === 'CARD' ? "Card" : "Banner",
    format,
    status: normalizedStatus,
    clicks: ad._count?.clicks || 0,
    startDate: ad.startDateTime,
    endDate: ad.endDateTime,
    createdAt: ad.createdAt,
  };
}

export default function AdvertisementsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
// ... (omitted lines for brevity, but I will replace the whole block if needed)

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to first page on new search
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const [status, setStatus] = useState<string>("");
  const [adType, setAdType] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [createdAt, setCreatedAt] = useState<string>("");
  const limit = 10;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["advertisements", page, limit, debouncedSearch, status, adType, startDate, endDate, createdAt],
    queryFn: () => 
      advertisementsApi.list({ 
        page, 
        limit, 
        search: debouncedSearch, 
        status: status || undefined, 
        displayType: adType || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        createdAt: createdAt || undefined,
      }),
  });

  const allRows = useMemo(
    () => (data?.data ?? []).map(mapAdToListItem),
    [data?.data],
  );

  const filteredRows = useMemo(() => {
    if (!debouncedSearch.trim()) return allRows;
    const normalizedQuery = debouncedSearch.trim().toLowerCase();
    return allRows.filter((item) =>
      item.title.toLowerCase().includes(normalizedQuery),
    );
  }, [allRows, debouncedSearch]);

  const canCreate = canManageAdvertisements();

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      advertisementsApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["advertisements"] });
      toast.success("Status updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update status");
    },
  });

  const handleStatusChange = (id: string, status: string) => {
    statusMutation.mutate({ id, status });
  };

  const handleRepublish = (id: string) => {
    const ad = data?.data.find((a) => a.id === id);
    if (ad) {
      navigate("/ads/new", { state: { republishFrom: ad } });
    }
  };

  const handleClone = async (id: string) => {
    const response = await advertisementsApi.clone(id);
    if(response){
      toast.success("Advertisement cloned successfully");
      refetch();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-semibold text-foreground">Advertisements</h2>
          <p className="text-sm text-muted-foreground">
            Manage and track all your ad campaigns in one place.
          </p>
        </div>

        <Button
          className="gap-2 rounded-md px-4"
          disabled={!canCreate}
          onClick={() => navigate("/ads/new")}
        >
          <Plus className="h-4 w-4" />
          New Advertisements
        </Button>
      </div>

      <AdvertisementsTable
        rows={filteredRows}
        loading={isLoading}
        page={page}
        total={data?.total ?? FALLBACK_TOTAL}
        limit={limit}
        search={search}
        onSearchChange={setSearch}
        onPageChange={setPage}
        filters={{
          status,
          adType,
          startDate,
          endDate,
          createdAt,
        }}
        onFiltersChange={(newFilters) => {
          setStatus(newFilters.status);
          setAdType(newFilters.adType);
          setStartDate(newFilters.startDate);
          setEndDate(newFilters.endDate);
          setCreatedAt(newFilters.createdAt);
          setPage(1); // Reset to first page on filter change
        }}
        onView={(id) => navigate(`/ads/${id}`)}
        onEdit={(id) => navigate(`/ads/${id}/edit`)}
        onClicksView={(id) => navigate(`/ads/${id}/clicks`)}
        onClone={(id) => handleClone(id)}
        onStatusChange={handleStatusChange}
        onRepublish={handleRepublish}
      />
    </div>
  );
}