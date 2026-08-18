import { DataTable, type Column } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import type { Job } from '@/types';
import { SlidersHorizontal, MoreVertical, ChevronDown } from 'lucide-react';
import { useState } from 'react';

interface JobFilters {
  status: string;
  jobType: string;
  startDate: string;
  endDate: string;
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface JobListProps {
  jobs: Job[];
  total: number;
  page: number;
  limit: number;
  loading?: boolean;
  onPageChange: (page: number) => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  filters: JobFilters;
  onFiltersChange: (filters: JobFilters) => void;
  isAdmin: boolean;
  /** Hide the org name subtitle under job title (default: true) */
  showOrganizationColumn?: boolean;
  /** Show the Edit button for non-admin users (default: true) */
  showEditButton?: boolean;
  onView: (jobId: string) => void;
  onApplicantsClick?: (job: Job) => void;
  onExternalClicksClick?: (job: Job) => void;
  onEdit?: (jobId: string) => void;
  onApprove?: (jobId: string) => void;
  onPublish?: (jobId: string) => void;
  onReject?: (jobId: string) => void;
  onDelete?: (jobId: string) => void;
  actionsLoading?: boolean;
  /** Ids of jobs currently selected via the row checkboxes (current page only). */
  selectedJobIds: string[];
  onSelectedJobIdsChange: (jobIds: string[]) => void;
  onBulkPublish?: (jobIds: string[]) => void;
  onBulkReject?: (jobIds: string[]) => void;
  onBulkDelete?: (jobIds: string[]) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function JobList({
  jobs,
  total,
  page,
  limit,
  loading,
  onPageChange,
  searchValue,
  onSearchChange,
  filters,
  onFiltersChange,
  isAdmin,
  showOrganizationColumn = true,
  showEditButton = true,
  onView,
  onApplicantsClick,
  onExternalClicksClick,
  onEdit,
  onPublish,
  onReject,
  onDelete,
  actionsLoading,
  selectedJobIds,
  onSelectedJobIdsChange,
  onBulkPublish,
  onBulkReject,
  onBulkDelete,
}: JobListProps) {
  const [localFilters, setLocalFilters] = useState(filters);

  const canPublishJob = (j: Job) =>
    isAdmin ? j.status === 'DRAFT' || j.status === 'CLOSED' : j.status === 'DRAFT';
  const canRejectJob = (j: Job) => j.status !== 'CLOSED';

  const selectedJobs = jobs.filter((j) => selectedJobIds.includes(j.id));
  const bulkPublishIds = selectedJobs.filter(canPublishJob).map((j) => j.id);
  const bulkRejectIds = selectedJobs.filter(canRejectJob).map((j) => j.id);
  const bulkDeleteIds = selectedJobs.map((j) => j.id);

  const allSelected = jobs.length > 0 && jobs.every((j) => selectedJobIds.includes(j.id));

  const toggleSelectAll = (checked: boolean) => {
    onSelectedJobIdsChange(checked ? jobs.map((j) => j.id) : []);
  };

  const toggleSelectOne = (jobId: string, checked: boolean) => {
    onSelectedJobIdsChange(
      checked ? [...selectedJobIds, jobId] : selectedJobIds.filter((id) => id !== jobId)
    );
  };

  const formatSalary = (j: Job) => {
    if (!j.salaryMin && !j.salaryMax) return '—';
    const fmt = (v: number) => `₹${(v / 100000).toFixed(1)}L`;
    if (j.salaryMin && j.salaryMax) return `${fmt(j.salaryMin)} - ${fmt(j.salaryMax)}`;
    return j.salaryMin ? fmt(j.salaryMin) : fmt(j.salaryMax!);
  };

  const columns: Column<Job>[] = [
    {
      key: 'select',
      header: (
        <Checkbox
          checked={allSelected}
          onCheckedChange={(checked) => toggleSelectAll(checked === true)}
          aria-label="Select all jobs"
        />
      ),
      className: 'w-10',
      render: (j) => (
        <Checkbox
          checked={selectedJobIds.includes(j.id)}
          onCheckedChange={(checked) => toggleSelectOne(j.id, checked === true)}
          aria-label={`Select ${j.title}`}
        />
      ),
    },
    {
      key: 'title',
      header: 'Job Title',
      render: (j) => (
        <div>
          <p className="font-medium text-card-foreground">{j.title}</p>
          {showOrganizationColumn && (
            <p className="text-xs text-muted-foreground">{j.organization?.name }</p>
          )}
        </div>
      ),
    },
    {
      key: 'salary',
      header: 'Salary',
      render: (j) => <span className="text-xs">{formatSalary(j)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (j) => <StatusBadge status={j.status.toLowerCase()} />,
    },
    {
      key: 'applicants',
      header: 'Applicants',
      render: (j) => {
        const count = j._count?.applications ?? 0;
        if (j.jobType === 'EXTERNAL') {
          return onExternalClicksClick ? (
            <button
              onClick={() => onExternalClicksClick(j)}
              className="text-sm font-medium text-primary hover:underline"
            >
              {count} clicks
            </button>
          ) : (
            <span className="text-sm">{count} clicks</span>
          );
        }
        return onApplicantsClick ? (
          <button
            onClick={() => onApplicantsClick(j)}
            className="text-sm font-medium text-primary hover:underline"
          >
            {count}
          </button>
        ) : (
          <span className="text-sm">{count}</span>
        );
      },
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (j) => (
        <span className="text-xs text-muted-foreground">
          {new Date(j.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (j) => {
        const canPublish = canPublishJob(j) && onPublish;
        const canReject = canRejectJob(j) && onReject;

        return (
          <div className="flex justify-end items-center whitespace-nowrap">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onView(j.id)}>
                  View
                </DropdownMenuItem>
                {showEditButton && onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(j.id)}>
                    Edit
                  </DropdownMenuItem>
                )}
                {canPublish && (
                  <DropdownMenuItem
                    onClick={() => onPublish(j.id)}
                    disabled={actionsLoading}
                  >
                    Publish
                  </DropdownMenuItem>
                )}
                {canReject && (
                  <DropdownMenuItem
                    onClick={() => onReject(j.id)}
                    disabled={actionsLoading}
                  >
                    Reject
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem
                    onClick={() => onDelete(j.id)}
                    disabled={actionsLoading}
                    className="text-rose-600"
                  >
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  const handleApply = () => {
    onFiltersChange(localFilters);
  };

  const handleReset = () => {
    const reset = {
      status: '',
      jobType: '',
      startDate: '',
      endDate: '',
    };
    setLocalFilters(reset);
    onFiltersChange(reset);
  };

  const activeFiltersCount = Object.values(filters).filter(v => !!v).length;

  return (
    <DataTable
      columns={columns}
      data={jobs}
      total={total}
      page={page}
      limit={limit}
      loading={loading}
      onPageChange={onPageChange}
      searchPlaceholder="Search jobs..."
      searchValue={searchValue}
      onSearchChange={onSearchChange}
      actions={
        <>
          {selectedJobIds.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  Bulk Actions
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {bulkPublishIds.length > 0 && onBulkPublish && (
                  <DropdownMenuItem onClick={() => onBulkPublish(bulkPublishIds)}>
                    Publish
                  </DropdownMenuItem>
                )}
                {bulkRejectIds.length > 0 && onBulkReject && (
                  <DropdownMenuItem onClick={() => onBulkReject(bulkRejectIds)}>
                    Reject
                  </DropdownMenuItem>
                )}
                {bulkDeleteIds.length > 0 && onBulkDelete && (
                  <DropdownMenuItem
                    onClick={() => onBulkDelete(bulkDeleteIds)}
                    className="text-rose-600"
                  >
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
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
                  <Label>Date Range</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="job-filter-from" className="text-[10px] uppercase text-muted-foreground">From</Label>
                      <Input
                        id="job-filter-from"
                        type="date"
                        value={localFilters.startDate}
                        onChange={(e) => setLocalFilters({ ...localFilters, startDate: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="job-filter-to" className="text-[10px] uppercase text-muted-foreground">To</Label>
                      <Input
                        id="job-filter-to"
                        type="date"
                        value={localFilters.endDate}
                        onChange={(e) => setLocalFilters({ ...localFilters, endDate: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="job-filter-status">Status</Label>
                  <Select
                    value={localFilters.status}
                    onValueChange={(v) => setLocalFilters({ ...localFilters, status: v })}
                  >
                    <SelectTrigger id="job-filter-status">
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="CLOSED">Closed</SelectItem>
                      <SelectItem value="DRAFT">Draft</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="job-filter-type">Job Type</Label>
                  <Select
                    value={localFilters.jobType || 'ALL'}
                    onValueChange={(v) => setLocalFilters({ ...localFilters, jobType: v === 'ALL' ? '' : v })}
                  >
                    <SelectTrigger id="job-filter-type">
                      <SelectValue placeholder="Select Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All</SelectItem>
                      <SelectItem value="INTERNAL">Internal</SelectItem>
                      <SelectItem value="EXTERNAL">External</SelectItem>
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
        </>
      }
    />
  );
}
