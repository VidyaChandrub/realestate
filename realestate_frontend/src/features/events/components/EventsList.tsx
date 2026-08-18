import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataTable, type Column } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { employersApi, eventsApi } from '@/api/services';
import { hasAdminRole } from '@/auth/roles';
import { toast } from 'sonner';
import { Loader2, Plus, Building2, SlidersHorizontal, MoreVertical } from 'lucide-react';
import type { Event, EventRegistration } from '@/types';
import { useAuthStore } from '@/store/authStore';
import {
  persistJobOrganizations,
  persistSelectedJobOrganizationId,
  readStoredJobOrganizationId,
  resolveJobOrganizations,
  resolveSelectedJobOrganizationId,
  type EmployerMeData,
} from '@/lib/jobOrganizationSync';

// Helper function to format date and time from ISO string
const formatDateAndTime = (isoString: string) => {
  const date = new Date(isoString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return {
    date: `${day}/${month}/${year}`,
    time: `${hours}:${minutes}`,
  };
};

export interface EventsListProps {
  employerId?: string;
  hideHeader?: boolean;
}

export function EventsList({ employerId, hideHeader }: EventsListProps) {
  const userRoles = useAuthStore((s) => s.user?.roles ?? []);
  const isAdmin = hasAdminRole(userRoles);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [registrationSearch, setRegistrationSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filters, setFilters] = useState({
    status: '',
    startDate: '',
    endDate: '',
    registrationType: '',
    mode: '',
  });
  const [localFilters, setLocalFilters] = useState(filters);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [registrationModalOpen, setRegistrationModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const limit = 100;
  const token = useAuthStore((s) => s.token);

  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(
    () => employerId ?? readStoredJobOrganizationId()
  );

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
  const organizationsLoading = !employerId && (meLoading || fallbackOrganizationsLoading);

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (filters.status === '' && filters.startDate === '' && filters.endDate === '' && filters.registrationType === '' && filters.mode === '') {
      setLocalFilters(filters);
    }
  }, [filters]);

  const handleApplyFilters = () => {
    setFilters(localFilters);
    setPage(1);
  };

  const handleResetFilters = () => {
    const nextFilters = { status: '', startDate: '', endDate: '', registrationType: '', mode: '' };
    setLocalFilters(nextFilters);
    setFilters(nextFilters);
    setPage(1);
  };

  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

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

  const selectedOrganization = organizations.find((organization) => organization.id === selectedOrganizationId) ?? null;
  const hasOrganizations = employerId ? true : organizations.length > 0;

  const organizationStatus = selectedOrganization?.isSuspended
    ? 'SUSPENDED'
    : selectedOrganization?.isApproved
    ? 'ACTIVE'
    : 'PENDING';

  const isPendingEmployer = organizationStatus === 'PENDING';
  const isSuspendedEmployer = organizationStatus === 'SUSPENDED';
  const isActiveEmployer = organizationStatus === 'ACTIVE';
  const canAccessEvents = isAdmin || employerId || isActiveEmployer;

  const effectiveOrganizationId = employerId ?? (!isAdmin ? selectedOrganizationId ?? undefined : undefined);

  const { data, isLoading } = useQuery({
    queryKey: [
      'events',
      page,
      limit,
      debouncedSearch || '',
      filters.status || '',
      filters.startDate || '',
      filters.endDate || '',
      filters.registrationType || '',
      filters.mode || '',
      effectiveOrganizationId || '',
      isAdmin,
    ],
    queryFn: () =>
      eventsApi.list({
        page,
        limit,
        search: debouncedSearch || undefined,
        status: filters.status || undefined,
        startDate:
          filters.startDate && filters.startDate.length === 10
            ? new Date(`${filters.startDate}T00:00:00.000Z`).toISOString()
            : undefined,
        endDate:
          filters.endDate && filters.endDate.length === 10
            ? new Date(`${filters.endDate}T23:59:59.999Z`).toISOString()
            : undefined,
        registrationType: filters.registrationType || undefined,
        mode: filters.mode || undefined,
        organizationId: effectiveOrganizationId,
      }),
    enabled: !!employerId || isAdmin || (!organizationsLoading && hasOrganizations && isActiveEmployer),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const pageLoading = isAdmin ? isLoading : organizationsLoading || (hasOrganizations && isLoading);
  const { data: registrationsDataRaw, isLoading: regLoading } = useQuery({
    queryKey: ["registrations", selectedEvent?.id],
    queryFn: () => eventsApi.getRegistrations(selectedEvent!.id),
    enabled: !!selectedEvent,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const registrations = (() => {
    const raw = registrationsDataRaw as any;

    if (Array.isArray(raw?.registrations)) return raw.registrations;
    if (Array.isArray(raw?.data)) return raw.data;
    if (Array.isArray(raw?.data?.data)) return raw.data.data;
    if (Array.isArray(raw?.data?.items)) return raw.data.items;
    if (Array.isArray(raw)) return raw;

    return [];
  })();

  const filteredRegistrations = registrations.filter((r) => {
    const name = r.user?.fullName?.toLowerCase() || "";
    const email = r.user?.email?.toLowerCase() || "";

    const queryWords = registrationSearch
      .toLowerCase()
      .trim()
      .split(/\s+/); // split by space

    return queryWords.every(
      (word) => name.includes(word) || email.includes(word)
    );
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => eventsApi.publish(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Event published successfully.');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to publish event.');
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => eventsApi.approve(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Event approved.');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => eventsApi.cancel(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Event cancelled.');
      setDeleteDialogOpen(false);
      setSelectedEventId(null);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to cancel event.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => eventsApi.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Event deleted successfully.');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to delete event.');
    },
  });

  const meetingUrlPublishMutation = useMutation({
    mutationFn: ({ id, isMeetingUrlPublished }: { id: string; isMeetingUrlPublished: boolean }) =>
      eventsApi.update(id, { isMeetingUrlPublished }),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['events'] });
      void queryClient.invalidateQueries({ queryKey: ['events', variables.id] });
      toast.success(
        `Meeting URL ${variables.isMeetingUrlPublished ? 'published' : 'unpublished'} successfully.`,
      );
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update meeting URL publish status.');
    },
  });

  if (!employerId && !isAdmin && organizationsLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-36" />
            <Skeleton className="h-10 w-28" />
          </div>
        </div>
        <Skeleton className="h-[420px] w-full rounded-xl" />
      </div>
    );
  }

  if (!employerId && !isAdmin && !organizationsLoading && !hasOrganizations) {
    return (
      <Alert>
        <Building2 className="h-4 w-4" />
        <AlertTitle>No organization found</AlertTitle>
        <AlertDescription className="flex items-center justify-between gap-4">
          <span>
            This account is not linked to any organization yet. Use the Organisation module to set up your organization before posting events.
          </span>
          <Button type="button" onClick={() => navigate('/organisation')}>
            Open Organisation
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!canAccessEvents && !organizationsLoading && hasOrganizations) {
    return (
      <Alert>
        <Building2 className="h-4 w-4" />
        <AlertTitle>
          {isPendingEmployer ? 'Organization verification pending' : 'Organization access suspended'}
        </AlertTitle>
        <AlertDescription className="text-sm text-muted-foreground">
          {isPendingEmployer
            ? 'Your organization is currently under verification by the administrator. You will be able to create and manage events once your organization is approved.'
            : 'Your organization access has been suspended by the administrator. Event creation and management features are temporarily unavailable. Please contact the administrator for assistance.'}
        </AlertDescription>
      </Alert>
    );
  }

  const handleDelete = () => {
    if (selectedEventId) {
      cancelMutation.mutate(selectedEventId);
    }
  };

  const handleMeetingUrlPublishToggle = (event: Event, checked: boolean) => {
    const actionLabel = checked ? 'publish' : 'unpublish';

    if (
      !window.confirm(
        `Are you sure you want to ${actionLabel} the meeting URL for "${event.title}"?`,
      )
    ) {
      return;
    }

    meetingUrlPublishMutation.mutate({
      id: event.id,
      isMeetingUrlPublished: checked,
    });
  };

  const handleOpenRegistrations = (event: Event) => {
    navigate(employerId ? `/employers/${employerId}/events/${event.id}/registrations` : `/events/${event.id}/registrations`);
  };

  const handleCloseRegistrations = () => {
    setRegistrationModalOpen(false);
    setSelectedEvent(null);
    setRegistrationSearch(""); // ✅ clear search
  };

  const formatToIST = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const handleExport = (rows?: EventRegistration[]) => {
    if (!rows?.length) {
      toast.error("No registrations available to export.");
      return;
    }

    const escapeCsvValue = (value: string | number | null | undefined) => {
      const normalized = value == null ? "" : String(value);
      if (/[",\n]/.test(normalized)) {
        return `"${normalized.replace(/"/g, '""')}"`;
      }
      return normalized;
    };

    const csvRows = [
      ["Name", "Email", "Status", "Registered At"],
      ...rows.map((registration) => [
        registration.user?.fullName || "",
        registration.user?.email || registration.userId,
        registration.status,
        formatToIST(registration.registeredAt),
      ]),
    ];

    const blob = new Blob(
      [csvRows.map((row) => row.map(escapeCsvValue).join(",")).join("\n")],
      { type: "text/csv;charset=utf-8;" },
    );

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedEvent?.title ?? "event"}-registrations.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const handlePdfExport = (rows: EventRegistration[]) => {
    if (!rows?.length) {
      toast.error("No registrations available to export.");
      return;
    }

    const sanitizePdfText = (value: string) =>
      value
        .replace(/\\/g, "\\\\")
        .replace(/\(/g, "\\(")
        .replace(/\)/g, "\\)")
        .replace(/[^\x20-\x7E]/g, "?");

    const truncatePdfCell = (value: string, maxLength: number) => {
      if (value.length <= maxLength) return value.padEnd(maxLength, " ");
      return `${value.slice(0, maxLength - 3)}...`;
    };

    const buildPdfLine = (columns: string[]) =>
      [
        truncatePdfCell(columns[0], 24),
        truncatePdfCell(columns[1], 30),
        truncatePdfCell(columns[2], 12),
        truncatePdfCell(columns[3], 22),
      ].join(" | ");

    const allLines = [
      `Event Registrations: ${selectedEvent?.title ?? "Event"}`,
      `Generated: ${formatToIST(new Date().toISOString())}`,
      "",
      buildPdfLine(["Name", "Email", "Status", "Registered At"]),
      "-".repeat(98),
      ...rows.map((registration) =>
        buildPdfLine([
          registration.user?.fullName || "",
          registration.user?.email || registration.userId,
          registration.status,
          formatToIST(registration.registeredAt),
        ]),
      ),
    ];

    const linesPerPage = 45;
    const pages = Array.from(
      { length: Math.ceil(allLines.length / linesPerPage) },
      (_, index) => allLines.slice(index * linesPerPage, (index + 1) * linesPerPage),
    );

    const objects: string[] = [];
    const fontObjectNumber = 3;
    const pageObjectNumbers = pages.map((_, index) => 4 + index * 2);
    const contentObjectNumbers = pages.map((_, index) => 5 + index * 2);

    objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
    objects[2] = `<< /Type /Pages /Kids [${pageObjectNumbers.map((n) => `${n} 0 R`).join(" ")}] /Count ${pages.length} >>`;
    objects[fontObjectNumber] = "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>";

    pages.forEach((pageLines, index) => {
      const pageObjectNumber = pageObjectNumbers[index];
      const contentObjectNumber = contentObjectNumbers[index];
      const streamLines = [
        "BT",
        "/F1 10 Tf",
        "40 800 Td",
        "14 TL",
        ...pageLines.flatMap((line, lineIndex) => [
          `${lineIndex === 0 ? "" : "T* "}(${sanitizePdfText(line)}) Tj`.trim(),
        ]),
        "ET",
      ];
      const stream = streamLines.join("\n");

      objects[pageObjectNumber] =
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontObjectNumber} 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`;
      objects[contentObjectNumber] =
        `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
    });

    let pdf = "%PDF-1.4\n";
    const offsets: number[] = [0];
    const maxObjectNumber = objects.length - 1;

    for (let objectNumber = 1; objectNumber <= maxObjectNumber; objectNumber += 1) {
      offsets[objectNumber] = pdf.length;
      pdf += `${objectNumber} 0 obj\n${objects[objectNumber]}\nendobj\n`;
    }

    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${maxObjectNumber + 1}\n`;
    pdf += "0000000000 65535 f \n";

    for (let objectNumber = 1; objectNumber <= maxObjectNumber; objectNumber += 1) {
      pdf += `${String(offsets[objectNumber]).padStart(10, "0")} 00000 n \n`;
    }

    pdf += `trailer\n<< /Size ${maxObjectNumber + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    const blob = new Blob([pdf], { type: "application/pdf" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedEvent?.title ?? "event"}-registrations.pdf`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const columns: Column<Event>[] = [
    {
      key: "title",
      header: "Event",
      className: "w-[20%] max-w-[250px] text-left",
      render: (e) => (
        <div className="space-x-0.5">
          <p className="font-medium text-card-foreground width20">{e.title}</p>
          <p className="text-xs text-muted-foreground">
            {e.organization?.name ?? e.organizationName ?? '—'}
          </p>
        </div>
      ),
    },
    {
      key: "capacity",
      header: "Capacity",
      className: "w-[15%] text-center whitespace-nowrap",
      render: (e) => {
        if (e.registrationType === "EXTERNAL") {
          const clicks = e.externalClickCount ?? 0;
          return (
            <span
              role="button"
              tabIndex={0}
              className="cursor-pointer rounded-sm font-mono text-sm text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              onClick={() => navigate(employerId ? `/employers/${employerId}/events/${e.id}/external-clicks` : `/events/${e.id}/external-clicks`)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  navigate(employerId ? `/employers/${employerId}/events/${e.id}/external-clicks` : `/events/${e.id}/external-clicks`);
                }
              }}
            >
              {clicks} {clicks === 1 ? "click" : "clicks"}
            </span>
          );
        }

        const count = e.registeredCount ?? 0;
        return (
          <span
            role="button"
            tabIndex={0}
            className="cursor-pointer rounded-sm font-mono text-sm text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            onClick={() => handleOpenRegistrations(e)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                handleOpenRegistrations(e);
              }
            }}
          >
            {count}/{e.capacity ?? "—"}
          </span>
        );
      },
    },
    {
      key: "startDate",
      header: "Event Date",
      className: "w-[25%] text-center whitespace-nowrap",
      render: (e) => {
        const start = formatDateAndTime(e.startDate);
        const end = formatDateAndTime(e.endDate);
        return (
          <div className="text-xs text-muted-foreground">
            <div className="font-medium truncate">
              {start.date} - {end.date}
            </div>
            <div className="truncate">
              {start.time} - {end.time}
            </div>
          </div>
        );
      },
    },
    {
      key: "createdAt",
      header: "Created",
      className: "w-[20%] text-center whitespace-nowrap",
      render: (e) => {
        if (!e.createdAt) {
          return <span className="text-muted-foreground">—</span>;
        }

        const created = formatDateAndTime(e.createdAt);
        return (
          <div className="text-xs text-muted-foreground">
            <div className="font-medium truncate">{created.date}</div>      
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      className: "w-[15%] text-center whitespace-nowrap",
      render: (e) => <StatusBadge status={e.status.toLowerCase()} />,
    },
    {
      key: "actions",
      header: "Actions",
      className: "w-[15%] text-right whitespace-nowrap",
      render: (e) => {
        const status = e.status?.toUpperCase?.() ?? "";
        const isDraft = status === "DRAFT";
        const isCancelled = status === "CANCELLED";
        const isCompleted = status === "COMPLETED";
        const isPublished = status === "PUBLISHED" || status === "ACTIVE";

        return (
          <div className="flex gap-2 justify-end items-center whitespace-nowrap">
            {isPublished && !isCompleted && e.meetingUrl && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Meeting URL</span>
                <Switch
                  checked={Boolean(e.isMeetingUrlPublished)}
                  onCheckedChange={(checked) => handleMeetingUrlPublishToggle(e, checked)}
                  disabled={meetingUrlPublishMutation.isPending}
                  aria-label={`Toggle meeting URL visibility for ${e.title}`}
                />
              </div>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => navigate(employerId ? `/employers/${employerId}/events/${e.id}` : `/events/${e.id}`)}
                >
                  View
                </DropdownMenuItem>
                {!isCompleted && !isCancelled && !isPublished && (
                  <DropdownMenuItem
                    onClick={() => publishMutation.mutate(e.id)}
                    disabled={publishMutation.isPending}
                  >
                    Publish
                  </DropdownMenuItem>
                )}
                {!isCompleted && !isCancelled && (
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedEventId(e.id);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    Cancel
                  </DropdownMenuItem>
                )}
                {(isDraft || isCancelled) && (
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => {
                      if (
                        window.confirm(
                          "Delete this event? This cannot be undone.",
                        )
                      ) {
                        deleteMutation.mutate(e.id);
                      }
                    }}
                    disabled={deleteMutation.isPending}
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

  const registrationColumns: Column<EventRegistration>[] = [
    {
      key: "user",
      header: "User",
      render: (registration) => {
        const user = registration.user;

        return (
          <div>
            <div className="font-medium">
              {user?.fullName || "—"}
            </div>
            <div className="text-xs text-muted-foreground">
              {user?.email || registration.userId}
            </div>
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Status",
    },
    {
      key: "registeredAt",
      header: "Registered At",
      render: (registration) => {
        const date = new Date(registration.registeredAt);
        return date.toLocaleString();
      },
    },
  ];

  return (
    <>
      <div className="space-y-6">
        {!hideHeader && (
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Events</h2>
              <p className="text-sm text-muted-foreground">
                Manage career events, fairs, and webinars.
              </p>
            </div>
            {(isAdmin || employerId || isActiveEmployer) && (
              <Button onClick={() => navigate(employerId ? `/employers/${employerId}/events/new` : "/events/new")} className="gap-2">
                <Plus className="h-4 w-4" />
                New Event
              </Button>
            )}
          </div>
        )}
        {hideHeader && employerId && isAdmin && (
          <div className="flex justify-end">
            <Button onClick={() => navigate(`/employers/${employerId}/events/new`)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Event
            </Button>
          </div>
        )}
        <DataTable
          columns={columns}
          data={data?.data ?? []}
          total={data?.total ?? 0}
          page={page}
          limit={limit}
          loading={pageLoading}
          onPageChange={setPage}
          searchPlaceholder="Search by Event..."
          searchValue={search}
          onSearchChange={setSearch}
          actions={
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
                    <Label htmlFor="event-filter-from" className="text-[10px] uppercase text-muted-foreground">From</Label>
                    <Input
                      id="event-filter-from"
                      type="date"
                      value={localFilters.startDate}
                      onChange={(e) => setLocalFilters({ ...localFilters, startDate: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="event-filter-to" className="text-[10px] uppercase text-muted-foreground">To</Label>
                    <Input
                      id="event-filter-to"
                      type="date"
                      value={localFilters.endDate}
                      onChange={(e) => setLocalFilters({ ...localFilters, endDate: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="event-filter-status">Status</Label>
                    <Select
                      value={localFilters.status || 'ALL'}
                      onValueChange={(value) =>
                        setLocalFilters({
                          ...localFilters,
                          status: value === 'ALL' ? '' : value,
                        })
                      }
                    >
                      <SelectTrigger id="event-filter-status">
                        <SelectValue placeholder="Select Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Statuses</SelectItem>
                        <SelectItem value="DRAFT">Draft</SelectItem>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="event-filter-registration-type">Registration Type</Label>
                    <Select
                      value={localFilters.registrationType || 'ALL'}
                      onValueChange={(value) =>
                        setLocalFilters({
                          ...localFilters,
                          registrationType: value === 'ALL' ? '' : value,
                        })
                      }
                    >
                      <SelectTrigger id="event-filter-registration-type">
                        <SelectValue placeholder="Select Registration Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Types</SelectItem>
                        <SelectItem value="INTERNAL">Internal</SelectItem>
                        <SelectItem value="EXTERNAL">External</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="event-filter-mode">Event Mode</Label>
                    <Select
                      value={localFilters.mode || 'ALL'}
                      onValueChange={(value) =>
                        setLocalFilters({
                          ...localFilters,
                          mode: value === 'ALL' ? '' : value,
                        })
                      }
                    >
                      <SelectTrigger id="event-filter-mode">
                        <SelectValue placeholder="Select Mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Modes</SelectItem>
                        <SelectItem value="ONLINE">Online</SelectItem>
                        <SelectItem value="OFFLINE">Offline</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <Button variant="ghost" className="flex-1" onClick={handleResetFilters}>
                      Reset all
                    </Button>
                    <Button className="flex-1" onClick={handleApplyFilters}>
                      Apply Now
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          }
        />
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Event</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this event? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogCancel>Keep Event</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={cancelMutation.isPending}
          >
            {cancelMutation.isPending ? "Cancelling..." : "Cancel Event"}
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={registrationModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseRegistrations();
          }
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Registered Users{selectedEvent?.title ? ` (${selectedEvent.title})` : ""}
            </DialogTitle>
            <DialogDescription>
              Review registration details for this event and export the list as CSV or PDF.
            </DialogDescription>
          </DialogHeader>

          {regLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : registrations.length ? (
            <div className="max-h-[420px] overflow-auto">
              <DataTable
                columns={registrationColumns}
                data={filteredRegistrations}
                total={registrations.length}
                page={1}
                limit={10}
                searchValue={registrationSearch}
                onSearchChange={setRegistrationSearch}
                actions={
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleExport(registrations)}
                    >
                      CSV
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePdfExport(registrations)}
                    >
                      PDF
                    </Button>
                  </div>
                }
              />
            </div>
          ) : (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No registrations found for this event.
            </div>
          )}

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between sm:space-x-0">
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
