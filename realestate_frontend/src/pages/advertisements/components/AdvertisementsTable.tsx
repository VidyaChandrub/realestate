import { MoreVertical, Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { AdvertisementListItem } from "..";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useState } from "react";

interface AdvertisementsTableProps {
  rows: AdvertisementListItem[];
  loading?: boolean;
  page: number;
  total: number;
  limit: number;
  search: string;
  onSearchChange: (value: string) => void;
  onPageChange: (nextPage: number) => void;
  filters: {
    status: string;
    adType: string;
    startDate: string;
    endDate: string;
    createdAt: string;
  };
  onFiltersChange: (filters: {
    status: string;
    adType: string;
    startDate: string;
    endDate: string;
    createdAt: string;
  }) => void;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onClicksView: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
  onRepublish: (adId: string) => void;
  onClone: (id: string) => void;
}

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  inactive: "bg-slate-100 text-slate-700",
  expired: "bg-amber-100 text-amber-700",
  completed: "bg-blue-100 text-blue-700",
  draft: "bg-gray-100 text-gray-700",
};

function formatDate(value: string) {
  if (!value) return "N/A";
  return new Date(value).toLocaleDateString("en-GB");
}

function formatTime(value: string) {
  if (!value) return "";
  return new Date(value).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function AdvertisementsTable({
  rows,
  loading,
  page,
  total,
  limit,
  search,
  onSearchChange,
  onPageChange,
  filters,
  onFiltersChange,
  onView,
  onEdit,
  onClicksView,
  onStatusChange,
  onRepublish,
  onClone
}: AdvertisementsTableProps) {
  const [localFilters, setLocalFilters] = useState(filters);
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(page, totalPages);
  const startIndex = total === 0 ? 0 : (safePage - 1) * limit + 1;
  const endIndex = Math.min(safePage * limit, total);

  const handleApply = () => {
    onFiltersChange(localFilters);
  };

  const handleReset = () => {
    const reset = {
      status: "",
      adType: "",
      startDate: "",
      endDate: "",
      createdAt: "",
    };
    setLocalFilters(reset);
    onFiltersChange(reset);
  };

  const activeFiltersCount = Object.values(filters).filter(v => !!v).length;

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            className="pl-10"
            placeholder="Search by Advertisements..."
          />
        </div>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Filter
              {activeFiltersCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                  {activeFiltersCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <h4 className="font-medium leading-none">Filter</h4>
              
              <div className="space-y-2">
                <Label>Ad Duration Range</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="from" className="text-[10px] uppercase text-muted-foreground">From</Label>
                    <Input
                      id="from"
                      type="date"
                      value={localFilters.startDate}
                      onChange={(e) => setLocalFilters({ ...localFilters, startDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="to" className="text-[10px] uppercase text-muted-foreground">To</Label>
                    <Input
                      id="to"
                      type="date"
                      value={localFilters.endDate}
                      onChange={(e) => setLocalFilters({ ...localFilters, endDate: e.target.value })}
                    />
                  </div>
                </div>
              </div>

<div className="space-y-2">
  <Label>Created At</Label>
<div>
                    <Label htmlFor="from" className="text-[10px] uppercase text-muted-foreground">From</Label>
                    <Input
                      id="from"
                      type="date"
                      value={localFilters.createdAt}
                      onChange={(e) => setLocalFilters({ ...localFilters, createdAt: e.target.value })}
                    />
</div>
</div>

              <div className="space-y-2">
                <Label htmlFor="ad-type">Ad Type</Label>
                <Select
                  value={localFilters.adType}
                  onValueChange={(v) => setLocalFilters({ ...localFilters, adType: v })}
                >
                  <SelectTrigger id="ad-type">
                    <SelectValue placeholder="Select Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BANNER">Banner</SelectItem>
                    <SelectItem value="CARD">Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={localFilters.status}
                  onValueChange={(v) => setLocalFilters({ ...localFilters, status: v })}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button variant="ghost" className="flex-1" onClick={handleReset}>
                  Reset all
                </Button>
                <Button className="flex-1" onClick={handleApply}>
                  Apply Now
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider">Ad Title</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider">Ad Type</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider">Status</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider">Clicks</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider">Ad Date</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider">Ad Created On</TableHead>
              <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 8 }).map((_, index) => (
                <TableRow key={`loading-${index}`}>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-32" /></TableCell>
                  <TableCell><Skeleton className="ml-auto h-4 w-4" /></TableCell>
                </TableRow>
              ))
            ) : rows.length ? (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium text-foreground">{row.title}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <p>{row.type}</p>
                    <p className="capitalize">({row.format})</p>
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium capitalize",
                        STATUS_STYLES[row.status] ?? "bg-slate-100 text-slate-700",
                      )}
                    >
                      {row.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => onClicksView(row.id)}
                      className="text-primary hover:underline font-medium"
                    >
                      {row.clicks}
                    </button>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <p>{formatDate(row.startDate)} - {formatDate(row.endDate)}</p>
                    <p>{formatTime(row.startDate)} - {formatTime(row.endDate)}</p>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(row.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onView(row.id)}>
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit(row.id)}>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onClone(row.id)}>
                          Clone
                        </DropdownMenuItem>
                        {row.status === 'active' && (
                          <DropdownMenuItem onClick={() => onStatusChange(row.id, 'INACTIVE')}>
                            Deactivate
                          </DropdownMenuItem>
                        )}
                        {row.status === 'draft' && (
                          <DropdownMenuItem onClick={() => onStatusChange(row.id, 'ACTIVE')}>
                            Publish
                          </DropdownMenuItem>
                        )}
                        {row.status === 'inactive' && (
                          <DropdownMenuItem onClick={() => onStatusChange(row.id, 'ACTIVE')}>
                            Activate
                          </DropdownMenuItem>
                        )}
                        {row.status === 'completed' && (
                          <DropdownMenuItem onClick={() => onRepublish(row.id)}>
                            Republish
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-28 text-center text-sm text-muted-foreground">
                  No advertisements found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <p>
          Showing {startIndex}-{endIndex} of {total}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.max(1, safePage - 1))}
            disabled={safePage <= 1}
          >
            Prev
          </Button>
          <span>
            {safePage} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
            disabled={safePage >= totalPages}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
