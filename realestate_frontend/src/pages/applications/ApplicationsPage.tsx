import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DataTable, type Column } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { employersApi, applicationsApi } from '@/api/services';
import { hasAdminRole } from '@/auth/roles';
import { useAuthStore } from '@/store/authStore';
import type { Application } from '@/types';

const columns: Column<Application>[] = [
  { key: 'applicant', header: 'Applicant', render: (a) => (
    <div>
      <p className="font-medium text-card-foreground">{a.user?.fullName ?? '—'}</p>
      <p className="text-xs text-muted-foreground">{a.user?.email ?? '—'}</p>
    </div>
  )},
  { key: 'job', header: 'Position', render: (a) => <span className="text-sm">{a.job?.title ?? '—'}</span> },
  { key: 'status', header: 'Status', render: (a) => <StatusBadge status={a.status.toLowerCase()} /> },
  { key: 'appliedAt', header: 'Applied', render: (a) => <span className="text-xs text-muted-foreground">{new Date(a.appliedAt).toLocaleDateString()}</span> },
  { key: 'actions', header: '', render: () => (
    <Button variant="ghost" size="sm" className="h-7 text-xs">View</Button>
  ), className: 'text-right' },
];

const SELECTED_ORGANIZATION_STORAGE_KEY = 'applications.selectedOrganizationId';

const readStoredOrganizationId = () => window.localStorage.getItem(SELECTED_ORGANIZATION_STORAGE_KEY);
const persistSelectedOrganizationId = (organizationId: string | null) => {
  if (organizationId) {
    window.localStorage.setItem(SELECTED_ORGANIZATION_STORAGE_KEY, organizationId);
  } else {
    window.localStorage.removeItem(SELECTED_ORGANIZATION_STORAGE_KEY);
  }
};

export default function ApplicationsPage() {
  const userRoles = useAuthStore((s) => s.user?.roles ?? []);
  const isAdmin = hasAdminRole(userRoles);
  const token = useAuthStore((s) => s.token);
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data: meData, isLoading: meLoading } = useQuery({
    queryKey: ['me-org'],
    queryFn: employersApi.getMe,
    enabled: !!token,
  });

  const selectedOrganizationId = meData?.defaultOrganizationId;

  const { data: selectedOrganization, isLoading: orgLoading } = useQuery({
    queryKey: ['organization', selectedOrganizationId],
    queryFn: () => employersApi.getOne(selectedOrganizationId!),
    enabled: !!selectedOrganizationId,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['applications', page, limit, selectedOrganizationId, isAdmin],
    queryFn: () =>
      applicationsApi.list({
        page,
        limit,
        organizationId: !isAdmin ? selectedOrganizationId ?? undefined : undefined,
      }),
    enabled: isAdmin || (!meLoading && !!selectedOrganizationId),
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Applications</h2>
        <p className="text-sm text-muted-foreground">Track and manage job applications.</p>
      </div>
      <DataTable columns={columns} data={data?.data ?? []} total={data?.total ?? 0} page={page} limit={limit} loading={isLoading} onPageChange={setPage} searchPlaceholder="Search applications..." />
    </div>
  );
}
