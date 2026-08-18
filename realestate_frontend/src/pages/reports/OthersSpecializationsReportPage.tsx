import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DataTable, type Column } from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import { toast } from 'sonner';
import { reportApi } from '@/api/services';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { OthersSpecializationReport, PaginatedOthersSpecializationReport, OthersSpecializationsSyncStatus } from '@/types';

const LIMIT = 100;

export default function OthersSpecializationsReportPage() {
  const [page, setPage] = useState(1);
  const [searchValue, setSearchValue] = useState('');
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'others-specializations', page, LIMIT, searchValue],
    queryFn: () => reportApi.getOthersSpecializations({
      page,
      limit: LIMIT,
      search: searchValue || undefined,
    }),
  });

  const { data: syncStatus } = useQuery({
    queryKey: ['reports', 'others-specializations', 'sync-status'],
    queryFn: () => reportApi.getOthersSpecializationsSyncStatus(),
  });

  const formatSyncDate = (timestamp?: string | null) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return 'Never';
    return date.toLocaleString('en-GB', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const lastSyncLabel = formatSyncDate(syncStatus?.lastSyncDate);
  const updatedCountLabel = syncStatus?.lastSyncUpdatedCount ?? 0;
  const columns: Column<OthersSpecializationReport>[] = [
    {
      key: 'value',
      header: 'Value',
      render: (item) => <span className="font-medium text-card-foreground">{item.value}</span>,
    },
    {
      key: 'type',
      header: 'Type',
      render: (item) => (
        <span className="text-xs capitalize font-mono">{item.type}</span>
      ),
    },
    {
      key: 'slug',
      header: 'Slug',
      render: (item) => (
        <span className="text-xs font-mono text-muted-foreground">{item.slug}</span>
      ),
    },
    {
      key: 'parent',
      header: 'Parent Qualification',
      render: (item) => (
        <span className="text-sm text-card-foreground">{item.parent}</span>
      ),
    },
    {
      key: 'usageCount',
      header: 'Usage Count',
      render: (item) => <span className="font-mono text-sm">{item.usageCount}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold text-foreground">Others Specializations Report</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Custom specializations submitted by users through onboarding and profile using the OTHERS option.
        </p>
      </div>
      <DataTable
        columns={columns}
        data={data?.items ?? []}
        total={data?.total ?? 0}
        page={page}
        limit={LIMIT}
        loading={isLoading}
        onPageChange={setPage}
        searchPlaceholder="Search specialization, slug, or qualification..."
        searchValue={searchValue}
        onSearch={(value) => {
          setSearchValue(value);
          setPage(1);
        }}
        actions={
          <>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 items-center justify-center rounded border border-border bg-background text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    aria-label="Sync status info"
                  >
                    <Info className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" align="start" className="max-w-[220px] whitespace-normal">
                  <div className="space-y-2 text-sm">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Last Sync</div>
                    <div>{lastSyncLabel}</div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Users Synchronized</div>
                    <div>{updatedCountLabel}</div>
                  </div>
                </TooltipContent>
              </Tooltip>
              <Button
                size="sm"
                className="h-8 text-xs"
                onClick={() => setIsExportDialogOpen(true)}
                disabled={isSyncing || isExporting}
              >
                {isExporting ? 'Exporting...' : 'Export CSV'}
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs"
                variant="outline"
                onClick={() => setIsDialogOpen(true)}
                disabled={isSyncing || isExporting}
              >
                {isSyncing ? `Syncing...` : `Sync Imported Specializations (${data?.total ?? 0})`}
              </Button>
            </div>
            <ConfirmDialog
              open={isDialogOpen}
              title="Sync Imported Specializations"
              description={
                'This will convert matching OTHERS specializations into Master Data specializations for existing users.\n\nOnly records that now exist in Master Data under the same qualification will be updated.\n\nThis action cannot be undone.'
              }
              confirmLabel="Sync"
              variant="default"
              onCancel={() => setIsDialogOpen(false)}
              onConfirm={async () => {
                setIsSyncing(true);
                try {
                  const res = await reportApi.syncOthersSpecializations();
                  // show backend message directly
                  toast.success(res.message);
                  // reset page and refresh report and sync status
                  setPage(1);
                  await queryClient.invalidateQueries({ queryKey: ['reports', 'others-specializations'] });
                  await queryClient.invalidateQueries({ queryKey: ['reports', 'others-specializations', 'sync-status'] });
                } catch (error: unknown) {
                  // attempt to extract backend message if available
                  const err = error as unknown;
                  let message = 'Failed to sync imported specializations';
                  if (typeof err === 'object' && err !== null) {
                    const e = err as { response?: { data?: unknown } };
                    const payload = e.response?.data;
                    if (typeof payload === 'string') message = payload;
                    else if (payload && typeof payload === 'object') {
                      const maybe = (payload as Record<string, unknown>)['message'];
                      if (typeof maybe === 'string') message = maybe;
                    }
                  }
                  toast.error(message);
                } finally {
                  setIsSyncing(false);
                  setIsDialogOpen(false);
                }
              }}
            />
            <ConfirmDialog
              open={isExportDialogOpen}
              title="Export Others Specializations CSV"
              description={
                'This CSV can be imported into Master Data.\n\nAfter importing the CSV into Master Data, return to this page and click:\n\n"Sync Imported Specializations" to update existing user education records.\n\nThis helps convert matching OTHERS specializations into Master Data specializations.'
              }
              confirmLabel="Export CSV"
              variant="default"
              onCancel={() => setIsExportDialogOpen(false)}
              onConfirm={async () => {
                setIsExporting(true);
                try {
                  const blob = await reportApi.exportOthersSpecializations();
                  const url = URL.createObjectURL(new Blob([blob]));
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = 'others-specializations.csv';
                  document.body.appendChild(link);
                  link.click();
                  link.remove();
                  URL.revokeObjectURL(url);
                  toast.success('CSV exported successfully');
                } catch (error) {
                  toast.error('Failed to export CSV');
                } finally {
                  setIsExporting(false);
                  setIsExportDialogOpen(false);
                }
              }}
            />
          </>
        }
      />
    </div>
  );
}
