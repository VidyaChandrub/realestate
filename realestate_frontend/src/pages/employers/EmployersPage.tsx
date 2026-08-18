import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataTable, type Column } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { employersApi } from '@/api/services';
import { hasAdminRole } from '@/auth/roles';
import { toast } from 'sonner';
import type { Employer } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { SlidersHorizontal } from 'lucide-react';

export default function EmployersPage() {
  const navigate = useNavigate();
  const userRoles = useAuthStore((s) => s.user?.roles ?? []);
  const isAdmin = hasAdminRole(userRoles);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState({ status: '' });
  const [localFilters, setLocalFilters] = useState(filters);
  const limit = 100;
  const queryClient = useQueryClient();
  const [eventCounts, setEventCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 400);

    return () => clearTimeout(timer);
  }, [search]);

  const handleApplyFilters = () => {
    setFilters(localFilters);
    setPage(1);
  };

  const handleResetFilters = () => {
    const reset = { status: '' };
    setLocalFilters(reset);
    setFilters(reset);
    setPage(1);
  };

  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  const mappedStatus =
    filters.status === "active"
      ? "APPROVED"
      : filters.status === "pending"
        ? "PENDING"
        : filters.status === "suspended"
          ? "SUSPENDED"
          : undefined;

  const { data, isLoading } = useQuery({
    queryKey: ['employers', page, limit, debouncedSearch, filters.status],
    queryFn: () => employersApi.list({
      page,
      limit,
      search: debouncedSearch || undefined,
      status: mappedStatus || undefined,
    }),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => employersApi.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employers'] });
      toast.success('Agency approved.');
    },
  });

  const suspendMutation = useMutation({
    mutationFn: (id: string) => employersApi.suspend(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employers'] });
      toast.success('Agency suspended.');
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: (id: string) => employersApi.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employers'] });
      toast.success('Agency reactivated.');
    },
  });

  useEffect(() => {
    if (!data?.data || data.data.length === 0) {
      setEventCounts({});
      return;
    }

    const fetchEventCounts = async () => {
      try {
        const counts: Record<string, number> = {};
        const responses = await Promise.all(
          data.data.map((employer) =>
            employersApi.getEvents(employer.id)
              .then((result) => {
                counts[employer.id] = result.total ?? 0;
              })
              .catch(() => {
                counts[employer.id] = 0;
              })
          )
        );
        setEventCounts(counts);
      } catch (error) {
        setEventCounts({});
      }
    };

    fetchEventCounts();
  }, [data?.data]);

  const columns: Column<Employer>[] = [
    { key: 'name', header: 'Company', render: (e) => (
      <div>
        <p className="font-medium text-card-foreground">{e.name}</p>
        {!e.creatorEmail && !e.contactEmail && (
          <p className="text-xs text-muted-foreground">{e.industry ?? '—'}</p>
        )}
      </div>
    )},
    { key: 'email', header: 'Email', render: (e) => (
      <span className="text-sm text-muted-foreground">{e.creatorEmail ?? e.contactEmail ?? '—'}</span>
    )},
    { key: 'mobile', header: 'Contact Number', render: (e) => (
      <span className="text-sm text-muted-foreground">{e.creatorMobileNumber ?? e.contactPhone ?? '—'}</span>
    )},
    { key: 'jobs', header: 'Properties', render: (e) => <span className="font-mono text-sm">{e._count?.jobs ?? e.jobsCount}</span> },
    { key: 'events', header: 'Events', render: (e) => <span className="font-mono text-sm">{eventCounts[e.id] ?? 0}</span> },
    { key: 'verificationStatus', header: 'Status', render: (e) => {
      const employerStatus = e.verificationStatus;
      return <StatusBadge status={employerStatus === 'APPROVED' ? 'active' : employerStatus === 'SUSPENDED' ? 'suspended' : 'pending'} />;
    } },
    { key: 'actions', header: '', render: (e) => {
      const employerStatus = e.verificationStatus;
      return (
        <div className="flex gap-1 justify-end">
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => navigate(`/employers/${e.id}`)}>View</Button>
          {isAdmin && employerStatus === 'PENDING' && (
            <Button variant="ghost" size="sm" className="h-7 text-xs text-primary" onClick={() => approveMutation.mutate(e.id)} disabled={approveMutation.isPending}>
              Approve
            </Button>
          )}
          {isAdmin && employerStatus === 'APPROVED' && (
            <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => suspendMutation.mutate(e.id)} disabled={suspendMutation.isPending}>
              Suspend
            </Button>
          )}
          {isAdmin && employerStatus === 'SUSPENDED' && (
            <Button variant="ghost" size="sm" className="h-7 text-xs text-primary" onClick={() => reactivateMutation.mutate(e.id)} disabled={reactivateMutation.isPending}>
              Reactivate
            </Button>
          )}
        </div>
      );
    }, className: 'text-right' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Admins</h2>
        <p className="text-sm text-muted-foreground">Manage admin accounts and organization access.</p>
      </div>
      <DataTable
        columns={columns}
        data={data?.data ?? []}
        total={data?.total ?? 0}
        page={page}
        limit={limit}
        loading={isLoading}
        onPageChange={setPage}
        searchPlaceholder="Search admins..."
        searchValue={search}
        onSearchChange={setSearch}
        onSearchSubmit={() => {
          setDebouncedSearch(search.trim());
          setPage(1);
        }}
        actions={
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                Filters
                {activeFiltersCount > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                    {activeFiltersCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72" align="end">
              <div className="space-y-4">
                <h4 className="font-medium leading-none">Filters</h4>

                <div className="space-y-2">
                  <Label htmlFor="employer-filter-status">Status</Label>
                  <Select
                    value={localFilters.status || 'ALL'}
                    onValueChange={(value) => setLocalFilters({ ...localFilters, status: value === 'ALL' ? '' : value })}
                  >
                    <SelectTrigger id="employer-filter-status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button variant="ghost" className="flex-1" onClick={handleResetFilters}>
                    Reset
                  </Button>
                  <Button className="flex-1" onClick={handleApplyFilters}>
                    Apply
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        }
      />
    </div>
  );
}
