import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataTable, type Column } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { campaignsApi } from '@/api/services';
import { hasAdminRole } from '@/auth/roles';
import { toast } from 'sonner';
import type { Campaign } from '@/types';
import { useAuthStore } from '@/store/authStore';

export default function CampaignsPage() {
  const userRoles = useAuthStore((s) => s.user?.roles ?? []);
  const isAdmin = hasAdminRole(userRoles);
  const [page, setPage] = useState(1);
  const limit = 10;
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['campaigns', page, limit],
    queryFn: () => campaignsApi.list({ page, limit }),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => campaignsApi.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success('Campaign approved.');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => campaignsApi.reject(id, 'Rejected by admin'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success('Campaign rejected.');
    },
  });

  const columns: Column<Campaign>[] = [
    { key: 'name', header: 'Campaign', render: (c) => (
      <div>
        <p className="font-medium text-card-foreground">{c.name}</p>
        <p className="text-xs text-muted-foreground">{c.type} · {c.pricingModel}</p>
      </div>
    )},
    { key: 'status', header: 'Status', render: (c) => <StatusBadge status={c.status.toLowerCase().replace('_', ' ')} /> },
    { key: 'budgetTotal', header: 'Budget', render: (c) => <span className="font-mono text-sm">₹{Number(c.budgetTotal).toLocaleString()}</span> },
    { key: 'budgetSpent', header: 'Spent', render: (c) => <span className="font-mono text-sm">₹{Number(c.budgetSpent).toLocaleString()}</span> },
    { key: 'startDate', header: 'Period', render: (c) => (
      <span className="text-xs text-muted-foreground">
        {new Date(c.startDate).toLocaleDateString()} – {new Date(c.endDate).toLocaleDateString()}
      </span>
    )},
    { key: 'actions', header: '', render: (c) => (
      <div className="flex gap-1 justify-end">
        <Button variant="ghost" size="sm" className="h-7 text-xs">View</Button>
        {isAdmin && c.status === 'PENDING_APPROVAL' && (
          <>
            <Button variant="ghost" size="sm" className="h-7 text-xs text-primary" onClick={() => approveMutation.mutate(c.id)} disabled={approveMutation.isPending}>
              Approve
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => rejectMutation.mutate(c.id)} disabled={rejectMutation.isPending}>
              Reject
            </Button>
          </>
        )}
      </div>
    ), className: 'text-right' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Advertisements</h2>
        <p className="text-sm text-muted-foreground">Manage ad campaigns, creatives, and targeting.</p>
      </div>
      <DataTable columns={columns} data={data?.data ?? []} total={data?.total ?? 0} page={page} limit={limit} loading={isLoading} onPageChange={setPage} searchPlaceholder="Search campaigns..." />
    </div>
  );
}
