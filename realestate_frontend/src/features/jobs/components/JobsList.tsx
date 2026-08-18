import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { employersApi, jobsApi } from '@/api/services';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useAuthStore } from '@/store/authStore';
import { hasAdminRole } from '@/auth/roles';
import { Building2 } from "lucide-react";
import { toast } from 'sonner';
import type { Employer, Job } from '@/types';
import {
  persistJobOrganizations,
  persistSelectedJobOrganizationId,
  readStoredJobOrganizationId,
  resolveJobOrganizations,
  resolveSelectedJobOrganizationId,
  type EmployerMeData,
} from '@/lib/jobOrganizationSync';
import { useMutation } from '@tanstack/react-query';
import { JobList } from '../JobList';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface JobsListProps {
  /**
   * When provided, the list is scoped to this employer's jobs only.
   * Org-resolution logic and the org-selector are skipped entirely.
   */
  employerId?: string;

  /**
   * When true, hides the page heading, description, and "Post Job" button.
   * Useful when embedding inside a parent card (e.g. EmployerDetailsPage).
   */
  hideHeader?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function JobsList({ employerId, hideHeader = false }: JobsListProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const userRoles = useAuthStore((s) => s.user?.roles ?? []);
  const isAdmin = hasAdminRole(userRoles);
  const token = useAuthStore((s) => s.token);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [rejectJob, setRejectJob] = useState<Job | null>(null);
  const [deleteJob, setDeleteJob] = useState<Job | null>(null);
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<
    { type: 'publish' | 'reject' | 'delete'; jobIds: string[] } | null
  >(null);
  const [filters, setFilters] = useState({
    status: '',
    jobType: '',
    startDate: '',
    endDate: '',
  });
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(
    () => employerId ?? readStoredJobOrganizationId()
  );
  const limit = 100;

  // ── Organization resolution (skipped when employerId is given) ──────────────
  const {
    data: meData,
    isLoading: meLoading,
  } = useQuery<EmployerMeData>({
    queryKey: ['employer-me'],
    queryFn: employersApi.getMe,
    enabled: !!token && !employerId,
  });

  const {
    data: fallbackOrganizations = [],
    isLoading: fallbackOrganizationsLoading,
  } = useQuery({
    queryKey: ['my-organizations', isAdmin],
    queryFn: async () => {
      if (isAdmin) {
        const res = await employersApi.list({ page: 1, limit: 1000 });
        return res.data;
      }
      return employersApi.listMine();
    },
    enabled: !!token && !employerId,
  });

  const organizations = useMemo(
    () => (employerId ? [] : resolveJobOrganizations(meData, fallbackOrganizations)),
    [meData, fallbackOrganizations, employerId]
  );
  const organizationsLoading = !employerId && (fallbackOrganizationsLoading || (!isAdmin && !meData));

  useEffect(() => {
    // When a fixed employerId is provided, no org resolution is needed.
    if (employerId) {
      setSelectedOrganizationId(employerId);
      return;
    }
    if (organizationsLoading) return;

    persistJobOrganizations(organizations);

    if (organizations.length === 0) {
      setSelectedOrganizationId(null);
      persistSelectedJobOrganizationId(null);
      return;
    }

    const nextOrganizationId = resolveSelectedJobOrganizationId({
      meData,
      organizations,
      storedOrganizationId: readStoredJobOrganizationId(),
    });

    if (selectedOrganizationId !== nextOrganizationId) {
      setSelectedOrganizationId(nextOrganizationId);
    }

    persistSelectedJobOrganizationId(nextOrganizationId);
  }, [meData, organizations, organizationsLoading, selectedOrganizationId, employerId]);

  const selectedOrganization = organizations.find((o) => o.id === selectedOrganizationId) ?? null;
  const hasOrganizations = employerId ? true : organizations.length > 0;

  const organizationStatus = selectedOrganization?.isSuspended
    ? 'SUSPENDED'
    : selectedOrganization?.isApproved
    ? 'ACTIVE'
    : 'PENDING';

  const isPendingEmployer = organizationStatus === 'PENDING';
  const isSuspendedEmployer = organizationStatus === 'SUSPENDED';
  const isActiveEmployer = organizationStatus === 'ACTIVE';

  const isEmployerAccessRestricted =
    !isAdmin && !employerId && !organizationsLoading && hasOrganizations && !isActiveEmployer;

  useEffect(() => {
    setPage(1);
  }, [search]);

  const handleFiltersChange = (nextFilters: typeof filters) => {
    setFilters(nextFilters);
    setPage(1);
  };

  // ── Jobs query ──────────────────────────────────────────────────────────────
  const effectiveOrganizationId = employerId ?? (!isAdmin ? selectedOrganizationId ?? undefined : undefined);

  const { data, isLoading } = useQuery({
    queryKey: ['jobs', page, limit, effectiveOrganizationId ?? '', isAdmin, search, filters],
    queryFn: () =>
      jobsApi.list({
        page,
        limit,
        organizationId: effectiveOrganizationId,
        q: search || undefined,
        status: filters.status || undefined,
        jobType: filters.jobType || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
      }),
    enabled: !!employerId || isAdmin || (!organizationsLoading && hasOrganizations && isActiveEmployer),
  });

  const jobs = (((data as { jobs?: Job[]; data?: Job[] } | undefined)?.jobs ?? data?.data) ?? []) as Job[];
  const total = data?.total ?? 0;

  // ── Mutations ───────────────────────────────────────────────────────────────
  const invalidateJobs = () => queryClient.invalidateQueries({ queryKey: ['jobs'] });

  const getErrorMessage = (error: unknown, fallback: string): string => {
    if (error && typeof error === 'object' && 'response' in error) {
      const data = (error as { response?: { data?: unknown } }).response?.data;
      if (data && typeof data === 'object' && 'message' in data) {
        const message = (data as { message?: unknown }).message;
        if (typeof message === 'string') return message;
      }
    }
    return error instanceof Error ? error.message : fallback;
  };

  /**
   * Builds the delete-conflict toast message for a 409 "already applied" response.
   * Supports two error shapes reaching the mutation's onError:
   *  - Shape A (raw AxiosError): status/body live under `error.response`.
   *  - Shape B (already-unwrapped/transformed error): `statusCode`/`job`/`message` live
   *    directly on the error object.
   * Returns `undefined` when `error` isn't such a conflict.
   */
  const getDeleteConflictMessage = (error: unknown): string | undefined => {
    const payload: { job?: unknown; message?: unknown } | undefined =
      error instanceof AxiosError
        ? error.response?.status === 409 && error.response.data && typeof error.response.data === 'object'
          ? (error.response.data as { job?: unknown; message?: unknown })
          : undefined
        : error && typeof error === 'object' &&
          ((error as { statusCode?: unknown; status?: unknown }).statusCode === 409 ||
            (error as { statusCode?: unknown; status?: unknown }).status === 409)
        ? (error as { job?: unknown; message?: unknown })
        : undefined;

    if (!payload) return undefined;

    const title = payload.job && typeof payload.job === 'object' ? (payload.job as { title?: unknown }).title : undefined;
    if (typeof title === 'string' && title) {
      return `The job "${title}" cannot be deleted because candidates have already applied. Close the job instead.`;
    }
    return typeof payload.message === 'string' ? payload.message : undefined;
  };

  const approveMutation = useMutation({
    mutationFn: (id: string) => jobsApi.approve(id),
    onSuccess: () => { invalidateJobs(); toast.success('Job approved.'); },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => jobsApi.reject(id, 'Rejected by admin'),
    onSuccess: () => { invalidateJobs(); toast.success('Job rejected.'); setRejectJob(null); },
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => jobsApi.publish(id),
    onSuccess: () => { invalidateJobs(); toast.success('Job published.'); },
    onError: (error: unknown) => { toast.error(error instanceof Error ? error.message : 'Failed to publish job.'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => jobsApi.delete(id),
    onSuccess: () => { invalidateJobs(); toast.success('Job deleted.'); setDeleteJob(null); },
    onError: (error: unknown) => {
      toast.error(getDeleteConflictMessage(error) ?? getErrorMessage(error, 'Failed to delete job.'));
    },
  });

  const bulkPublishMutation = useMutation({
    mutationFn: (jobIds: string[]) => jobsApi.bulkPublish(jobIds),
    onSuccess: (_data, jobIds) => {
      invalidateJobs();
      const count = jobIds.length;
      toast.success(`${count} ${count === 1 ? 'job' : 'jobs'} published successfully.`);
      setBulkAction(null);
      setSelectedJobIds([]);
    },
    onError: (error: unknown) => { toast.error(error instanceof Error ? error.message : 'Failed to publish jobs.'); },
  });

  const bulkRejectMutation = useMutation({
    mutationFn: (jobIds: string[]) => jobsApi.bulkReject(jobIds),
    onSuccess: (_data, jobIds) => {
      invalidateJobs();
      const count = jobIds.length;
      toast.success(`${count} ${count === 1 ? 'job' : 'jobs'} rejected successfully.`);
      setBulkAction(null);
      setSelectedJobIds([]);
    },
    onError: (error: unknown) => { toast.error(error instanceof Error ? error.message : 'Failed to reject jobs.'); },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (jobIds: string[]) => jobsApi.bulkDelete(jobIds),
    onSuccess: (_data, jobIds) => {
      invalidateJobs();
      const count = jobIds.length;
      toast.success(`${count} ${count === 1 ? 'job' : 'jobs'} deleted successfully.`);
      setBulkAction(null);
      setSelectedJobIds([]);
    },
    onError: (error: unknown) => {
      toast.error(getDeleteConflictMessage(error) ?? getErrorMessage(error, 'Failed to delete jobs.'));
    },
  });

  const handleBulkConfirm = () => {
    if (!bulkAction) return;
    if (bulkAction.type === 'publish') bulkPublishMutation.mutate(bulkAction.jobIds);
    if (bulkAction.type === 'reject') bulkRejectMutation.mutate(bulkAction.jobIds);
    if (bulkAction.type === 'delete') bulkDeleteMutation.mutate(bulkAction.jobIds);
  };

  const bulkSelectedCount = bulkAction?.jobIds.length ?? 0;
  const bulkIsPlural = bulkSelectedCount !== 1;
  const bulkActionTitle =
    bulkAction?.type === 'publish' ? `Publish ${bulkIsPlural ? 'Jobs' : 'Job'}` :
    bulkAction?.type === 'reject' ? `Reject ${bulkIsPlural ? 'Jobs' : 'Job'}` :
    'Delete Jobs';
  const bulkActionDescription =
    bulkAction?.type === 'publish'
      ? `Are you sure you want to publish ${bulkSelectedCount} selected job${bulkIsPlural ? 's' : ''}?`
      : bulkAction?.type === 'reject'
      ? `Are you sure you want to reject ${bulkSelectedCount} selected job${bulkIsPlural ? 's' : ''}?\n\nThe selected job${bulkIsPlural ? 's' : ''} will be moved to Closed status and will no longer be visible to users until published again.`
      : `Are you sure you want to permanently delete ${bulkSelectedCount} selected job${bulkIsPlural ? 's' : ''}?`;

  const isAnyActionPending =
    approveMutation.isPending || rejectMutation.isPending ||
    publishMutation.isPending || deleteMutation.isPending ||
    bulkPublishMutation.isPending || bulkRejectMutation.isPending || bulkDeleteMutation.isPending;

  // ── Loading skeleton (only shown in standalone mode) ────────────────────────
  const pageLoading = isAdmin
    ? isLoading
    : organizationsLoading || (hasOrganizations && isLoading);

  if (!employerId && !isAdmin && organizationsLoading) {
    return (
      <div className="space-y-4">
        {!hideHeader && (
          <div className="flex items-start justify-between">
            <div className="space-y-2"><Skeleton className="h-8 w-32" /><Skeleton className="h-4 w-64" /></div>
            <div className="flex gap-2"><Skeleton className="h-10 w-36" /><Skeleton className="h-10 w-28" /></div>
          </div>
        )}
        <Skeleton className="h-[420px] w-full rounded-xl" />
      </div>
    );
  }

  // ── No org alert (only shown in standalone mode) ────────────────────────────
  if (!employerId && !isAdmin && !organizationsLoading && !hasOrganizations) {
    return (
      <Alert>
        <Building2 className="h-4 w-4" />
        <AlertTitle>No organization found</AlertTitle>
        <AlertDescription className="flex items-center justify-between gap-4">
          <span>This account is not linked to any organization yet. Use the Organisation module to set up your organization before posting jobs.</span>
          <Button type="button" onClick={() => navigate('/organisation')}>Open Organisation</Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (isEmployerAccessRestricted) {
    return (
      <Alert>
        <Building2 className="h-4 w-4" />
        <AlertTitle>
          {isPendingEmployer ? 'Organization verification pending' : 'Organization access suspended'}
        </AlertTitle>
        <AlertDescription className="text-sm text-muted-foreground">
          {isPendingEmployer
            ? 'Your organization is currently under verification by the administrator. You will be able to create, manage, and publish jobs once your organization is approved.'
            : 'Your organization access has been suspended by the administrator. Job posting and management features are temporarily unavailable. Please contact the administrator for assistance.'}
        </AlertDescription>
      </Alert>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {!hideHeader && (
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Jobs</h2>
            <p className="text-sm text-muted-foreground">
              {isAdmin
                ? 'Review, approve, and manage job postings.'
                : 'Create, edit, publish, and manage jobs for your organization.'}
            </p>
            {!isAdmin && selectedOrganization && organizations.length === 1 && (
              <p className="mt-1 text-xs text-muted-foreground">Organization: {selectedOrganization.name}</p>
            )}
          </div>
        </div>
      )}

      <JobList
        jobs={jobs}
        total={total}
        page={page}
        limit={limit}
        loading={pageLoading}
        onPageChange={(nextPage) => { setPage(nextPage); setSelectedJobIds([]); }}
        searchValue={search}
        onSearchChange={setSearch}
        filters={filters}
        onFiltersChange={handleFiltersChange}
        isAdmin={isAdmin}
        showOrganizationColumn={!employerId}
        showEditButton={false}
        onView={(jobId) => navigate(employerId ? `/employers/${employerId}/jobs/${jobId}` : `/jobs/${jobId}`)}
        onApplicantsClick={(job) => navigate(employerId ? `/employers/${employerId}/jobs/${job.id}/applications` : `/jobs/${job.id}/applications`)}
        onExternalClicksClick={(job) => navigate(employerId ? `/employers/${employerId}/jobs/${job.id}/external-clicks` : `/jobs/${job.id}/external-clicks`)}
        onEdit={(jobId) => navigate(employerId ? `/employers/${employerId}/jobs/${jobId}/edit` : `/jobs/${jobId}/edit`)}
        onApprove={(jobId) => approveMutation.mutate(jobId)}
        onPublish={(jobId) => publishMutation.mutate(jobId)}
        onReject={(jobId) => { const job = jobs.find((j) => j.id === jobId); if (job) setRejectJob(job); }}
        onDelete={(jobId) => { const job = jobs.find((j) => j.id === jobId); if (job) setDeleteJob(job); }}
        actionsLoading={isAnyActionPending}
        selectedJobIds={selectedJobIds}
        onSelectedJobIdsChange={setSelectedJobIds}
        onBulkPublish={(jobIds) => setBulkAction({ type: 'publish', jobIds })}
        onBulkReject={(jobIds) => setBulkAction({ type: 'reject', jobIds })}
        onBulkDelete={(jobIds) => setBulkAction({ type: 'delete', jobIds })}
      />

      <ConfirmDialog
        open={!!rejectJob}
        title="Reject Job"
        description={`Are you sure you want to reject "${rejectJob?.title}"? This action cannot be undone.`}
        confirmLabel="Reject"
        variant="destructive"
        onConfirm={() => rejectJob && rejectMutation.mutate(rejectJob.id)}
        onCancel={() => setRejectJob(null)}
      />

      <ConfirmDialog
        open={!!deleteJob}
        title="Delete Job"
        description={`Are you sure you want to delete "${deleteJob?.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => deleteJob && deleteMutation.mutate(deleteJob.id)}
        onCancel={() => setDeleteJob(null)}
      />

      <ConfirmDialog
        open={!!bulkAction}
        title={bulkActionTitle}
        description={bulkActionDescription}
        confirmLabel={
          bulkAction?.type === 'publish' ? 'Publish' :
          bulkAction?.type === 'reject' ? 'Reject' :
          'Delete'
        }
        variant={bulkAction?.type === 'publish' ? 'default' : 'destructive'}
        onConfirm={handleBulkConfirm}
        onCancel={() => setBulkAction(null)}
      />
    </div>
  );
}
