import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DataTable, type Column } from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { jobsApi } from '@/api/services';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import type { ExternalClickRow } from '@/types';

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const JobExternalClicksPage = () => {
  const navigate = useNavigate();
  const { employerId, jobId } = useParams<{ employerId?: string; jobId: string }>();
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const limit = 100;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['job-external-clicks', jobId, page],
    queryFn: () => jobsApi.getExternalClicks(jobId ?? '', { page, limit }),
    enabled: Boolean(jobId),
    keepPreviousData: true,
  });

  const clicks: ExternalClickRow[] = data?.clicks ?? [];

  const handleExportCsv = async () => {
    if (!jobId) return;
    setExporting(true);
    try {
      const blob = await jobsApi.downloadExternalClicksCsv(jobId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `job-${jobId}-external-clicks.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Unable to export CSV. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const columns: Column<ExternalClickRow>[] = [
    {
      key: 'name',
      header: 'Name',
      className: 'max-w-[200px] truncate',
      render: (c) => <span className="font-medium">{c.user?.fullName ?? '—'}</span>,
    },
    {
      key: 'email',
      header: 'Email',
      className: 'max-w-[240px] truncate',
      render: (c) => c.user?.email ?? '—',
    },
    {
      key: 'clickedAt',
      header: 'Clicked At',
      className: 'max-w-[180px] whitespace-nowrap',
      render: (c) => (c.clickedAt ? formatDateTime(c.clickedAt) : '—'),
    },
  ];

  if (!jobId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">Job ID is missing from the URL.</p>
          <Button className="mt-4" onClick={() => navigate(employerId ? `/employers/${employerId}` : '/jobs')}>
            Back to jobs
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-4 items-start justify-start">
        <Button
          variant="ghost"
          className="w-fit flex items-center gap-2 px-0 text-sm text-muted-foreground hover:text-foreground"
          onClick={() => navigate(employerId ? `/employers/${employerId}/jobs/${jobId}` : '/jobs')}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-foreground">External Job Apply Clicks</h2>
          <p className="text-sm text-muted-foreground">
            Users who clicked Apply on this external job.
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={clicks}
        total={data?.total ?? 0}
        page={page}
        limit={limit}
        loading={isLoading}
        onPageChange={(newPage) => setPage(newPage)}
        actions={
          <Button variant="outline" onClick={handleExportCsv} disabled={exporting || clicks.length === 0}>
            {exporting ? 'Exporting...' : 'Download CSV'}
          </Button>
        }
      />

      {isError && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          Unable to load clicks. Please try again.
        </div>
      )}
    </div>
  );
};

export default JobExternalClicksPage;
