import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Loader2, Mail, MapPin, Phone, Shield, SlidersHorizontal, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';
import { eventsApi, usersApi } from '@/api/services';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DataTable, type Column } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';
import { useMasterData } from '@/hooks/useMasterData';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/SearchableSelect';
import type { MasterDataItem, User } from '@/types';

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
}

function formatExperience(months?: number | null) {
  if (months == null) return '—';
  if (months === 0) return 'Fresher';
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  return `${years > 0 ? `${years} year${years > 1 ? 's' : ''}` : ''}${
    years > 0 && remainingMonths > 0 ? ' ' : ''
  }${remainingMonths > 0 ? `${remainingMonths} month${remainingMonths > 1 ? 's' : ''}` : ''}`.trim();
}

function formatWorkMode(value?: string | null) {
  if (!value) return '—';
  const normalized = value.toString().toUpperCase();
  return normalized === 'ONSITE' ? 'Onsite' : normalized === 'REMOTE' ? 'Remote' : normalized === 'HYBRID' ? 'Hybrid' : value;
}

function formatShiftPreference(value?: string | null) {
  if (!value) return '—';
  const normalized = value.toString().toUpperCase();
  return normalized === 'DAY' ? 'Day' : normalized === 'NIGHT' ? 'Night' : value;
}

const COMPANY_SIZE_LABELS: Record<string, string> = {
  ONE_TO_TEN: '1-10',
  ELEVEN_TO_FIFTY: '11-50',
  FIFTY_ONE_TO_TWO_HUNDRED: '51-200',
  TWO_HUNDRED_ONE_TO_FIVE_HUNDRED: '201-500',
  FIVE_HUNDRED_PLUS: '500+',
};

function formatCompanySize(value?: string | null) {
  if (value == null) return '—';

  const rawValue = typeof value === 'string' ? value.trim() : String(value);
  if (!rawValue) return '—';

  const normalized = rawValue.toUpperCase();
  return COMPANY_SIZE_LABELS[normalized] ?? rawValue;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function getSkillLabels(skills?: unknown, skillMap?: Map<string, string>): string[] {
  if (!Array.isArray(skills)) return [];
  return skills
    .map((skill) => {
      if (!skill) return '';
      if (typeof skill === 'string') return isUuid(skill) ? '' : skill.trim();
      if (typeof skill === 'object' && skill !== null) {
        const label =
          (skill as any).name ||
          (skill as any).skillName ||
          (skill as any).label ||
          (skill as any).value;
        if (typeof label === 'string' && label.trim()) {
          return label.trim();
        }

        const masterDataId = typeof (skill as any).masterDataId === 'string' ? (skill as any).masterDataId : undefined;
        const mappedValue = masterDataId ? skillMap?.get(masterDataId) : undefined;
        return typeof mappedValue === 'string' && mappedValue.trim() ? mappedValue.trim() : '';
      }
      return '';
    })
    .filter(Boolean);
}

function getFirstValidString(...values: Array<string | null | undefined>): string | null {
  return values.find((value) => typeof value === 'string' && value.trim())?.trim() ?? null;
}

function safeString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number') return String(value);
  return null;
}

function formatEmploymentStatus(value?: string | null) {
  if (!value) return null;
  const normalized = value.toString().toUpperCase();
  return normalized === 'FULL_TIME' ? 'Full Time' : normalized === 'PART_TIME' ? 'Part Time' : normalized === 'CONTRACT' ? 'Contract' : value;
}

function formatNoticePeriod(value?: unknown) {
  const notice = safeString(value);
  return notice ? `Notice: ${notice}` : null;
}

function formatDuration(years?: unknown, months?: unknown) {
  const y = typeof years === 'number' ? years : typeof years === 'string' && years.trim() ? Number(years) : NaN;
  const m = typeof months === 'number' ? months : typeof months === 'string' && months.trim() ? Number(months) : NaN;
  if (Number.isNaN(y) && Number.isNaN(m)) return null;
  if (Number.isNaN(y)) return `${m} month${m === 1 ? '' : 's'}`;
  if (Number.isNaN(m) || m === 0) return `${y} year${y === 1 ? '' : 's'}`;
  return `${y} year${y === 1 ? '' : 's'} ${m} month${m === 1 ? '' : 's'}`;
}

export default function UsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    startDate: '',
    endDate: '',
    stateId: '',
    cityId: '',
    educationId: '',
  });
  const [localFilters, setLocalFilters] = useState(filters);
  const [stateSearch, setStateSearch] = useState('');
  const [debouncedStateSearch, setDebouncedStateSearch] = useState('');
  const [selectedStateOption, setSelectedStateOption] = useState<{ id: string; value: string } | null>(null);
  const [citySearch, setCitySearch] = useState('');
  const [debouncedCitySearch, setDebouncedCitySearch] = useState('');
  const [selectedCityOption, setSelectedCityOption] = useState<{ id: string; value: string } | null>(null);
  const [educationSearch, setEducationSearch] = useState('');
  const [debouncedEducationSearch, setDebouncedEducationSearch] = useState('');
  const [selectedEducationOption, setSelectedEducationOption] = useState<{ id: string; value: string } | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [statusDialogUser, setStatusDialogUser] = useState<User | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [bulkStatusAction, setBulkStatusAction] = useState<
    { type: 'activate' | 'deactivate'; userIds: string[] } | null
  >(null);
  const limit = 100;
  const queryClient = useQueryClient();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 400);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedStateSearch(stateSearch.trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [stateSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCitySearch(citySearch.trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [citySearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedEducationSearch(educationSearch.trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [educationSearch]);

  const handleApplyFilters = () => {
    setFilters(localFilters);
    setPage(1);
  };

  const handleResetFilters = () => {
    const reset = { status: '', startDate: '', endDate: '', stateId: '', cityId: '', educationId: '' };
    setLocalFilters(reset);
    setFilters(reset);
    setSelectedStateOption(null);
    setStateSearch('');
    setDebouncedStateSearch('');
    setSelectedCityOption(null);
    setCitySearch('');
    setDebouncedCitySearch('');
    setSelectedEducationOption(null);
    setEducationSearch('');
    setDebouncedEducationSearch('');
    setPage(1);
  };

  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  const { data: skillItems = [] } = useQuery({
    queryKey: ['skills'],
    queryFn: eventsApi.getSkills,
    staleTime: 5 * 60 * 1000,
  });

  const { data: educationLevelItems = [] } = useQuery({
    queryKey: ['education-levels'],
    queryFn: eventsApi.getEducationLevels,
    staleTime: 5 * 60 * 1000,
  });

  const skillMap = useMemo(
    () => new Map<string, string>(
      (skillItems ?? []).map((item: any) => [item.id, item.value]),
    ),
    [skillItems],
  );

  const educationLevelMap = useMemo(
    () => new Map<string, string>(
      (educationLevelItems ?? []).map((item: any) => [item.id, item.value]),
    ),
    [educationLevelItems],
  );

  const { data: allStateItems = [] } = useMasterData('LOCATION_STATE');
  const { data: allCityItems = [] } = useMasterData('LOCATION_CITY');

  const stateNameMap = useMemo(
    () => new Map<string, string>(
      (allStateItems ?? []).map((item: MasterDataItem) => [item.id, item.value]),
    ),
    [allStateItems],
  );

  const cityNameMap = useMemo(
    () => new Map<string, string>(
      (allCityItems ?? []).map((item: MasterDataItem) => [item.id, item.value]),
    ),
    [allCityItems],
  );

  const { data: searchedStateItems = [] } = useQuery({
    queryKey: ['search-states', debouncedStateSearch],
    queryFn: () => eventsApi.searchMasterData(debouncedStateSearch, 'LOCATION_STATE'),
    enabled: Boolean(debouncedStateSearch),
    staleTime: 30 * 1000,
  });

  const stateOptions = useMemo(() => {
    const base = (searchedStateItems ?? []).map((item: MasterDataItem) => ({ id: item.id, value: item.value }));
    if (selectedStateOption && !base.some((option) => option.id === selectedStateOption.id)) {
      return [selectedStateOption, ...base];
    }
    return base;
  }, [searchedStateItems, selectedStateOption]);

  const { data: searchedCityItems = [] } = useQuery({
    queryKey: ['search-cities', localFilters.stateId, debouncedCitySearch],
    queryFn: () => eventsApi.searchMasterData(debouncedCitySearch, 'LOCATION_CITY', localFilters.stateId),
    enabled: Boolean(debouncedCitySearch) && Boolean(localFilters.stateId),
    staleTime: 30 * 1000,
  });

  const cityOptions = useMemo(() => {
    const base = (searchedCityItems ?? []).map((item: MasterDataItem) => ({ id: item.id, value: item.value }));
    if (selectedCityOption && !base.some((option) => option.id === selectedCityOption.id)) {
      return [selectedCityOption, ...base];
    }
    return base;
  }, [searchedCityItems, selectedCityOption]);

  const { data: searchedEducationItems = [] } = useQuery({
    queryKey: ['search-education-levels', debouncedEducationSearch],
    queryFn: () => eventsApi.searchMasterData(debouncedEducationSearch, 'EDUCATION_LEVEL'),
    enabled: Boolean(debouncedEducationSearch),
    staleTime: 30 * 1000,
  });

  const educationOptions = useMemo(() => {
    const base = (searchedEducationItems ?? []).map((item: MasterDataItem) => ({ id: item.id, value: item.value }));
    if (selectedEducationOption && !base.some((option) => option.id === selectedEducationOption.id)) {
      return [selectedEducationOption, ...base];
    }
    return base;
  }, [searchedEducationItems, selectedEducationOption]);

  const { data, isLoading } = useQuery({
    queryKey: [
      'users',
      page,
      limit,
      debouncedSearch,
      filters.status,
      filters.startDate,
      filters.endDate,
      filters.stateId,
      filters.cityId,
      filters.educationId,
    ],
    queryFn: () =>
      usersApi.list({
        page,
        limit,
        search: debouncedSearch || undefined,
        isActive:
          filters.status === 'active'
            ? true
            : filters.status === 'inactive'
            ? false
            : undefined,
        startDate:
          filters.startDate && filters.startDate.length === 10
            ? new Date(`${filters.startDate}T00:00:00.000Z`).toISOString()
            : undefined,
        endDate:
          filters.endDate && filters.endDate.length === 10
            ? new Date(`${filters.endDate}T23:59:59.999Z`).toISOString()
            : undefined,
        stateId: filters.stateId || undefined,
        cityId: filters.cityId || undefined,
        educationId: filters.educationId || undefined,
      }),
  });

  const { data: selectedUser, isLoading: isUserLoading } = useQuery({
    queryKey: ['user', selectedUserId],
    queryFn: () => usersApi.getById(selectedUserId!),
    enabled: !!selectedUserId && isViewOpen,
  });

  const toggleStatus = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      usersApi.updateStatus(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      if (selectedUserId) {
        queryClient.invalidateQueries({ queryKey: ['user', selectedUserId] });
      }
      toast.success('User status updated.');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Failed to update user status.';
      toast.error(message);
    },
  });

  const bulkActivateMutation = useMutation({
    mutationFn: (userIds: string[]) => usersApi.bulkActivate(userIds),
    onSuccess: (_data, userIds) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(`${userIds.length} user${userIds.length === 1 ? '' : 's'} activated successfully.`);
      setBulkStatusAction(null);
      setSelectedUserIds([]);
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Failed to activate users.';
      toast.error(message);
    },
  });

  const bulkDeactivateMutation = useMutation({
    mutationFn: (userIds: string[]) => usersApi.bulkDeactivate(userIds),
    onSuccess: (_data, userIds) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(`${userIds.length} user${userIds.length === 1 ? '' : 's'} deactivated successfully.`);
      setBulkStatusAction(null);
      setSelectedUserIds([]);
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Failed to deactivate users.';
      toast.error(message);
    },
  });

  const handleBulkStatusConfirm = () => {
    if (!bulkStatusAction) return;
    if (bulkStatusAction.type === 'activate') bulkActivateMutation.mutate(bulkStatusAction.userIds);
    if (bulkStatusAction.type === 'deactivate') bulkDeactivateMutation.mutate(bulkStatusAction.userIds);
  };

  const bulkSelectedCount = bulkStatusAction?.userIds.length ?? 0;
  const bulkIsPlural = bulkSelectedCount !== 1;
  const bulkStatusTitle =
    bulkStatusAction?.type === 'activate'
      ? `Activate ${bulkIsPlural ? 'Users' : 'User'}`
      : `Deactivate ${bulkIsPlural ? 'Users' : 'User'}`;
  const bulkStatusDescription =
    bulkStatusAction?.type === 'activate'
      ? `Are you sure you want to activate ${bulkSelectedCount} selected user${bulkIsPlural ? 's' : ''}?\n\nThe selected user${bulkIsPlural ? 's' : ''} will regain access to the platform and ${bulkIsPlural ? 'notification emails' : 'a notification email'} will be sent informing them that ${bulkIsPlural ? 'their accounts have' : 'their account has'} been activated.`
      : `Are you sure you want to deactivate ${bulkSelectedCount} selected user${bulkIsPlural ? 's' : ''}?\n\nThe selected user${bulkIsPlural ? 's' : ''} will no longer be able to access the platform and ${bulkIsPlural ? 'notification emails' : 'a notification email'} will be sent informing them that ${bulkIsPlural ? 'their accounts have' : 'their account has'} been deactivated.`;

  const makeEmployer = useMutation({
    mutationFn: (userId: string) => usersApi.makeEmployer(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      if (selectedUserId) {
        queryClient.invalidateQueries({ queryKey: ['user', selectedUserId] });
      }
      toast.success('User role updated to employer.');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Failed to update the user role.';
      toast.error(message);
    },
  });

  const openView = (userId: string) => {
    setSelectedUserId(userId);
    setIsViewOpen(true);
  };

  const handleOpenChange = (open: boolean) => {
    setIsViewOpen(open);
    if (!open) {
      setSelectedUserId(null);
    }
  };

  const handleToggleStatus = (user: User) => {
    if (!user.userId) {
      toast.error('Unable to update user status');
      return;
    }

    toggleStatus.mutate({
      id: user.userId,
      isActive: !user.isActive,
    });
  };

  const selectedRoles = selectedUser?.preferences?.roles ?? [];
  const selectedUserRole = (selectedUser as any)?.role?.toString().toUpperCase() || '';
  const selectedUserType = (selectedUser as any)?.type?.toString().toUpperCase() || '';
  const normalizedUserType = (selectedUser?.userType || selectedUserRole || selectedUserType || '').toString().toUpperCase();
  const isEmployer = selectedRoles.some((role) => role.toLowerCase() === 'employer' || role.toLowerCase() === 'admin')
    || selectedUserRole === 'EMPLOYER'
    || selectedUserRole === 'ADMIN'
    || selectedUserType === 'EMPLOYER'
    || selectedUserType === 'ADMIN';
  const isEmployerView = isEmployer || normalizedUserType === 'EMPLOYER' || normalizedUserType === 'EMPLOYERS' || normalizedUserType === 'ADMIN';
  const displayName = selectedUser?.fullName || [selectedUser?.firstName, selectedUser?.lastName].filter(Boolean).join(' ') || 'Unnamed User';
  const displayUserType = selectedUser?.userType || (selectedUser as any)?.role || (selectedUser as any)?.type || 'user';
  const skillLabels = getSkillLabels(selectedUser?.skills, skillMap);
  const latestExperience = Array.isArray(selectedUser?.experience)
    ? (selectedUser?.experience[0] as Record<string, unknown> | undefined)
    : undefined;
  const latestEducation = Array.isArray(selectedUser?.education)
    ? (selectedUser?.education[0] as Record<string, unknown> | undefined)
    : undefined;
  const highestQualificationLabel = safeString(
    (selectedUser as any)?.highestQualificationId
      ? educationLevelMap.get((selectedUser as any).highestQualificationId)
      : null,
  );

  const resolvedCurrentJobTitle =
    getFirstValidString(
      selectedUser?.currentJobTitle,
      selectedUser?.jobTitle,
      latestExperience?.jobTitle as string | undefined
    ) ?? '—';
  const resolvedCurrentCompanyName =
    getFirstValidString(
      selectedUser?.currentCompanyName,
      selectedUser?.companyName,
      latestExperience?.companyName as string | undefined
    ) ?? '—';
  const experienceStatus = formatEmploymentStatus(
    (latestExperience?.employmentStatus as string | null) ?? null
  );
  const experienceNotice = formatNoticePeriod(latestExperience?.noticePeriod);
  const experienceDuration = formatDuration(
    latestExperience?.yearsOfExperience,
    latestExperience?.monthsOfExperience
  );

  const educationSpecialization = getFirstValidString(
    latestEducation?.specialization as string | null,
    latestEducation?.course as string | null,
    latestEducation?.degree as string | null
  );
  const educationUniversity = getFirstValidString(
    latestEducation?.universityName as string | null,
    latestEducation?.collegeName as string | null,
    latestEducation?.institution as string | null
  );
  const educationYear = safeString(latestEducation?.yearOfPassing);
  const educationPercentage = safeString(latestEducation?.percentage);

  const users = data?.data ?? [];
  const allSelected = users.length > 0 && users.every((u) => selectedUserIds.includes(u.userId));

  const toggleSelectAll = (checked: boolean) => {
    setSelectedUserIds(checked ? users.map((u) => u.userId) : []);
  };

  const toggleSelectOne = (userId: string, checked: boolean) => {
    setSelectedUserIds(
      checked ? [...selectedUserIds, userId] : selectedUserIds.filter((id) => id !== userId)
    );
  };

  const columns: Column<User>[] = [
    {
      key: 'select',
      header: (
        <Checkbox
          checked={allSelected}
          onCheckedChange={(checked) => toggleSelectAll(checked === true)}
          aria-label="Select all users"
        />
      ),
      className: 'w-10',
      render: (u) => (
        <Checkbox
          checked={selectedUserIds.includes(u.userId)}
          onCheckedChange={(checked) => toggleSelectOne(u.userId, checked === true)}
          aria-label={`Select ${u.fullName}`}
        />
      ),
    },
    {
      key: 'fullName',
      header: 'Name',
      render: (u) => (
        <div>
          <p className="font-medium text-card-foreground">{u.fullName}</p>
          <p className="text-xs text-muted-foreground">{u.email}</p>
        </div>
      ),
    },
    {
      key: 'userType',
      header: 'Type',
      render: (u) => <span className="text-xs font-medium capitalize">{u.userType}</span>,
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (u) => <StatusBadge status={u.isActive ? 'active' : 'inactive'} />,
    },
    {
      key: 'createdAt',
      header: 'Joined',
      render: (u) => <span className="text-xs text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</span>,
    },
    {
      key: 'location',
      header: 'Location',
      render: (u) => {
        const stateName = u.stateId ? stateNameMap.get(u.stateId) : undefined;
        const cityName = u.currentCityId ? cityNameMap.get(u.currentCityId) : undefined;
        const label = [stateName, cityName].filter(Boolean).join(', ');
        return <span className="text-xs text-muted-foreground">{label || '—'}</span>;
      },
    },
    {
      key: 'education',
      header: 'Education',
      render: (u) => {
        const label = u.highestQualificationId ? educationLevelMap.get(u.highestQualificationId) : undefined;
        return <span className="text-xs text-muted-foreground">{label || '—'}</span>;
      },
    },
    {
      key: 'actions',
      header: '',
      render: (u) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openView(u.userId)}>
            View
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setStatusDialogUser(u)}
            disabled={toggleStatus.isPending}
          >
            {u.isActive ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      ),
      className: 'text-right',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Users</h2>
        <p className="text-sm text-muted-foreground">Manage platform users, roles, and account status.</p>
      </div>

      <DataTable
        columns={columns}
        data={users}
        total={data?.total ?? 0}
        page={page}
        limit={limit}
        loading={isLoading}
        searchPlaceholder="Search users by name and email..."
        searchValue={search}
        onSearchChange={setSearch}
        onSearchSubmit={() => {
          setDebouncedSearch(search.trim());
          setPage(1);
        }}
        onPageChange={(nextPage) => { setPage(nextPage); setSelectedUserIds([]); }}
        actions={
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2" disabled={selectedUserIds.length === 0}>
                  Bulk Actions
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setBulkStatusAction({ type: 'activate', userIds: selectedUserIds })}>
                  Activate Users
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setBulkStatusAction({ type: 'deactivate', userIds: selectedUserIds })}>
                  Deactivate Users
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
              <PopoverContent className="w-80 p-0" align="end">
                <div className="flex max-h-[min(32rem,80vh)] flex-col">
                  <h4 className="px-4 pb-2 pt-4 font-medium leading-none">Filters</h4>

                  <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase text-muted-foreground">Signup Date</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label htmlFor="user-filter-start-date" className="text-[10px] uppercase text-muted-foreground">From</Label>
                          <Input
                            id="user-filter-start-date"
                            type="date"
                            value={localFilters.startDate}
                            onChange={(e) => setLocalFilters({ ...localFilters, startDate: e.target.value })}
                          />
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor="user-filter-end-date" className="text-[10px] uppercase text-muted-foreground">To</Label>
                          <Input
                            id="user-filter-end-date"
                            type="date"
                            value={localFilters.endDate}
                            onChange={(e) => setLocalFilters({ ...localFilters, endDate: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>State</Label>
                      <SearchableSelect
                        value={localFilters.stateId}
                        onChange={(v) => {
                          const option = stateOptions.find((o) => o.id === v);
                          setSelectedStateOption(option ?? null);
                          setSelectedCityOption(null);
                          setCitySearch('');
                          setDebouncedCitySearch('');
                          setLocalFilters({ ...localFilters, stateId: v, cityId: '' });
                        }}
                        options={stateOptions}
                        placeholder="Search state..."
                        onSearch={setStateSearch}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>City</Label>
                      <SearchableSelect
                        value={localFilters.cityId}
                        onChange={(v) => {
                          const option = cityOptions.find((o) => o.id === v);
                          setSelectedCityOption(option ?? null);
                          setLocalFilters({ ...localFilters, cityId: v });
                        }}
                        options={cityOptions}
                        placeholder={localFilters.stateId ? 'Search city...' : 'Select State first'}
                        disabled={!localFilters.stateId}
                        onSearch={setCitySearch}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Qualification</Label>
                      <SearchableSelect
                        value={localFilters.educationId}
                        onChange={(v) => {
                          const option = educationOptions.find((o) => o.id === v);
                          setSelectedEducationOption(option ?? null);
                          setLocalFilters({ ...localFilters, educationId: v });
                        }}
                        options={educationOptions}
                        placeholder="Search qualification..."
                        onSearch={setEducationSearch}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="user-filter-status">Status</Label>
                      <Select
                        value={localFilters.status || 'ALL'}
                        onValueChange={(value) => setLocalFilters({ ...localFilters, status: value === 'ALL' ? '' : value })}
                      >
                        <SelectTrigger id="user-filter-status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 border-t p-4">
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
          </>
        }
      />

      <Dialog open={isViewOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              Review the user profile, account status, and role access.
            </DialogDescription>
          </DialogHeader>

          {isUserLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : !selectedUser ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Unable to load user details.
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4 rounded-lg border bg-muted/30 p-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold">{displayName}</h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={selectedUser.isActive ? 'active' : 'inactive'} />
                    <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium capitalize text-secondary-foreground">
                      {displayUserType}
                    </span>
                  </div>
                </div>
                {!isEmployerView && (
                  <div className="space-y-2 rounded-lg border bg-background/80 p-3 text-right text-sm">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Profile Completion</p>
                    <p className="text-lg font-semibold text-foreground">{selectedUser.profileCompletionPercentage ?? 0}%</p>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary/20">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.max(0, Math.min(100, selectedUser.profileCompletionPercentage ?? 0))}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {selectedUser.profileComplete ? 'Complete profile' : 'Profile incomplete'}
                    </p>
                  </div>
                )}
              </div>

              {isEmployerView ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3 rounded-lg border p-4">
                    <h4 className="font-medium">Contact Details</h4>
                    <div className="space-y-2 text-sm">
                      <p className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {selectedUser.email || '—'}
                      </p>
                      <p className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        {selectedUser.mobileNumber || selectedUser.phoneNumber || '—'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 rounded-lg border p-4">
                    <h4 className="font-medium">Organization Details</h4>
                    <div className="space-y-2 text-sm">
                      <p><span className="text-muted-foreground">Organization Name:</span> {selectedUser.organizationName || '—'}</p>
                      <p><span className="text-muted-foreground">Organization Email:</span> {selectedUser.organizationEmail || '—'}</p>
                      <p><span className="text-muted-foreground">Organization Phone:</span> {selectedUser.organizationPhone || '—'}</p>
                      <p><span className="text-muted-foreground">Website:</span> {selectedUser.website || '—'}</p>
                      <p><span className="text-muted-foreground">Industry:</span> {selectedUser.industry || '—'}</p>
                      <p><span className="text-muted-foreground">Company Size:</span> {formatCompanySize(selectedUser.companySize)}</p>
                      <p><span className="text-muted-foreground">Location:</span> {selectedUser.location || '—'}</p>
                      <p><span className="text-muted-foreground">Status:</span> {selectedUser.status || '—'}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-3 rounded-lg border p-4">
                      <h4 className="font-medium">Contact</h4>
                      <div className="space-y-2 text-sm">
                        <p className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          {selectedUser.email || '—'}
                        </p>
                        <p className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          {selectedUser.mobileNumber || selectedUser.phoneNumber || '—'}
                        </p>
                        <p className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          {[selectedUser.currentCity, selectedUser.state, selectedUser.country].filter(Boolean).join(', ') || '—'}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3 rounded-lg border p-4">
                      <h4 className="font-medium">Professional Details</h4>
                      <div className="space-y-2 text-sm">
                        <p><span className="text-muted-foreground">Current job title:</span> {resolvedCurrentJobTitle}</p>
                        <p><span className="text-muted-foreground">Current company:</span> {resolvedCurrentCompanyName}</p>
                        <p><span className="text-muted-foreground">Total experience:</span> {formatExperience(selectedUser.totalExperienceMonths)}</p>
                        <p><span className="text-muted-foreground">Work mode:</span> {formatWorkMode(selectedUser.preferredWorkMode)}</p>
                        <p><span className="text-muted-foreground">Availability:</span> {formatDate(selectedUser.availableJoiningDate)}</p>
                        <p><span className="text-muted-foreground">Shift preference:</span> {formatShiftPreference(selectedUser.shiftPreference)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-3 rounded-lg border p-4">
                      <h4 className="font-medium">Preferred Locations</h4>
                      {selectedUser.preferredLocations?.length ? (
                        <div className="flex flex-wrap gap-2">
                          {selectedUser.preferredLocations.map((location) => (
                            <span
                              key={location.locationId}
                              className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground"
                            >
                              {location.location}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No preferred locations provided.</p>
                      )}
                    </div>

                    <div className="space-y-3 rounded-lg border p-4">
                      <h4 className="flex items-center gap-2 font-medium">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        Skills & Profile
                      </h4>
                      <div className="space-y-4 text-sm">
                        <div className="space-y-2">
                          <p className="text-muted-foreground">Skills</p>
                          {skillLabels.length ? (
                            <div className="flex flex-wrap gap-2">
                              {skillLabels.slice(0, 6).map((skill) => (
                                <span
                                  key={skill}
                                  className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground"
                                >
                                  {skill}
                                </span>
                              ))}
                              {skillLabels.length > 6 && (
                                <span className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground">
                                  +{skillLabels.length - 6} more
                                </span>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">No skills provided.</p>
                          )}
                        </div>

                        {highestQualificationLabel || educationSpecialization || educationUniversity || educationYear || educationPercentage ? (
                          <div className="rounded-lg bg-muted/40 p-3 text-sm">
                            <p className="text-muted-foreground">Latest education</p>
                            {highestQualificationLabel ? (
                              <p className="mt-1 font-medium text-foreground">{highestQualificationLabel}</p>
                            ) : null}
                            {educationSpecialization ? (
                              <p className="text-sm text-muted-foreground">{educationSpecialization}</p>
                            ) : null}
                            {educationUniversity ? (
                              <p className="text-sm text-muted-foreground">{educationUniversity}</p>
                            ) : null}
                            {(educationYear || educationPercentage) ? (
                              <p className="text-xs text-muted-foreground">
                                {[educationYear, educationPercentage ? `${educationPercentage}` : null]
                                  .filter(Boolean)
                                  .join(' • ')}
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="flex flex-wrap justify-end gap-3 border-t pt-4">
                <Button
                  variant="outline"
                  onClick={() => setStatusDialogUser(selectedUser)}
                  disabled={toggleStatus.isPending}
                >
                  {toggleStatus.isPending ? 'Updating...' : selectedUser.isActive ? 'Deactivate' : 'Activate'}
                </Button>
                {/* <Button
                  onClick={() => makeEmployer.mutate(selectedUser.userId)}
                  disabled={makeEmployer.isPending || isEmployer}
                >
                  {makeEmployer.isPending ? 'Updating Role...' : isEmployer ? 'Already Employer' : 'Make Employer'}
                </Button> */}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!statusDialogUser}
        title={statusDialogUser?.isActive ? 'Deactivate User' : 'Activate User'}
        description={
          statusDialogUser?.isActive
            ? 'Are you sure you want to deactivate this user?\n\nThe user will no longer be able to access the platform and a notification email will be sent informing them that their account has been deactivated.'
            : 'Are you sure you want to activate this user?\n\nThe user will regain access to the platform and a notification email will be sent informing them that their account has been activated.'
        }
        confirmLabel={statusDialogUser?.isActive ? 'Deactivate' : 'Activate'}
        variant={statusDialogUser?.isActive ? 'destructive' : 'default'}
        onConfirm={() => {
          if (statusDialogUser) handleToggleStatus(statusDialogUser);
          setStatusDialogUser(null);
        }}
        onCancel={() => setStatusDialogUser(null)}
      />

      <ConfirmDialog
        open={!!bulkStatusAction}
        title={bulkStatusTitle}
        description={bulkStatusDescription}
        confirmLabel={bulkStatusAction?.type === 'activate' ? 'Activate' : 'Deactivate'}
        variant={bulkStatusAction?.type === 'activate' ? 'default' : 'destructive'}
        onConfirm={handleBulkStatusConfirm}
        onCancel={() => setBulkStatusAction(null)}
      />
    </div>
  );
}
