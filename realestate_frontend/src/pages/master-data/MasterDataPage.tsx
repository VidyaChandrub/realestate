import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { DataTable, type Column } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const MASTER_DATA_TYPES = [
  'JOB_CATEGORY',
  'EVENT_CATEGORY',
  'EDUCATION_LEVEL',
  'SPECIALIZATION',
  'EXPERIENCE_LEVEL',
  'EMPLOYMENT_TYPE',
  'LOCATION_COUNTRY',
  'LOCATION_STATE',
  'LOCATION_CITY',
  'SKILL',
  'INDUSTRY',
  'ORGANIZATION_TYPE',
  'AD_INTEREST',
  'SYSTEM_TAG',
];

const MASTER_DATA_STATUSES = ['DRAFT', 'ACTIVE', 'INACTIVE'];
const MASTER_DATA_STATUS_FILTER_OPTIONS = ['ACTIVE', 'DRAFT', 'INACTIVE'];

const normalizeMasterDataStatus = (status: string | undefined | null) => {
  if (!status) return 'DRAFT';
  const normalized = status === 'CLOSED' || status === 'EXPIRED' || status === 'ARCHIVED' ? 'INACTIVE' : status;
  return normalized;
};

const formatStatusLabel = (status: string) =>
  status
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { eventsApi, masterDataApi } from '@/api/services';
import { toast } from 'sonner';
import type { MasterDataItem } from '@/types';

/**
 * Safely extract error message from AxiosError or generic Error.
 * Handles 409 Conflict status specially for duplicate entry conflicts.
 */
function extractErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const status = error.response?.status;
    const apiMessage = error.response?.data?.message;

    // Handle 409 Conflict status specifically
    if (status === 409) {
      return 'Slug already exists.';
    }

    // Use backend error message if available
    if (apiMessage && typeof apiMessage === 'string') {
      return apiMessage;
    }
  }

  // Fallback for generic Error instances
  if (error instanceof Error) {
    return error.message;
  }

  // Final fallback for unknown errors
  return 'An error occurred. Please try again.';
}

export default function MasterDataPage() {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [deleteItem, setDeleteItem] = useState<MasterDataItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCsvDialogOpen, setIsCsvDialogOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [editItem, setEditItem] = useState<MasterDataItem | null>(null);
  const [formValues, setFormValues] = useState({
    type: '',
    value: '',
    slug: '',
    description: '',
    sortOrder: 0,
    status: 'ACTIVE',
    parentId: '',
  });
  const limit = 100;
  const queryClient = useQueryClient();

  const invalidateMasterDataQueries = async () => {
    eventsApi._masterDataCache = null;

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["master-data"] }),

      queryClient.invalidateQueries({ queryKey: ["countries"] }),
      queryClient.invalidateQueries({ queryKey: ["states"] }),
      queryClient.invalidateQueries({ queryKey: ["cities"] }),

      queryClient.invalidateQueries({ queryKey: ["skills"] }),
      queryClient.invalidateQueries({ queryKey: ["experience-levels"] }),
      queryClient.invalidateQueries({ queryKey: ["education-levels"] }),

      queryClient.invalidateQueries({ queryKey: ["search-countries"] }),
      queryClient.invalidateQueries({ queryKey: ["search-states"] }),
      queryClient.invalidateQueries({ queryKey: ["search-cities"] }),

      queryClient.invalidateQueries({ queryKey: ["event-location-search"] }),
      queryClient.invalidateQueries({ queryKey: ["skill-search"] }),
      queryClient.invalidateQueries({ queryKey: ["experience-search"] }),
      queryClient.invalidateQueries({ queryKey: ["education-search"] }),
      queryClient.invalidateQueries({ queryKey: ["search-specializations"] }),
      queryClient.invalidateQueries({ queryKey: ["master-data", "by-type", "EDUCATION_LEVEL"] }),
      queryClient.invalidateQueries({ queryKey: ["master-data", "SPECIALIZATION"] }),
      queryClient.invalidateQueries({
        queryKey: ["master-data", "by-type"],
      }),
    ]);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['master-data', page, limit, searchTerm, selectedType, selectedStatus],
    queryFn: () =>
      masterDataApi.list({
        page,
        limit,
        search: searchTerm || undefined,
        type: selectedType || undefined,
        status: selectedStatus || undefined,
      }),
  });

  const countriesQuery = useQuery({
    queryKey: ['master-data', 'LOCATION_COUNTRY'],
    queryFn: () => masterDataApi.list({ type: 'LOCATION_COUNTRY', limit: 1000 }),
    enabled: formValues.type === 'LOCATION_STATE',
    staleTime: 1000 * 60 * 5,
  });

  const statesQuery = useQuery({
    queryKey: ['master-data', 'LOCATION_STATE'],
    queryFn: () => masterDataApi.list({ type: 'LOCATION_STATE', limit: 1000 }),
    enabled: formValues.type === 'LOCATION_CITY',
    staleTime: 1000 * 60 * 5,
  });

  const educationQuery = useQuery({
    queryKey: ['master-data', 'by-type', 'EDUCATION_LEVEL'],
    queryFn: () => masterDataApi.getByType('EDUCATION_LEVEL'),
    enabled: formValues.type === 'SPECIALIZATION',
    staleTime: 1000 * 60 * 5,
  });

  const parentLookupQuery = useQuery({
    queryKey: ['master-data-parent-lookup'],
    queryFn: async () => {
      const [countries, states, educations] = await Promise.all([
        masterDataApi.getByType('LOCATION_COUNTRY'),
        masterDataApi.getByType('LOCATION_STATE'),
        masterDataApi.getByType('EDUCATION_LEVEL'),
      ]);

      return [...countries, ...states, ...educations];
    },
    staleTime: 1000 * 60 * 5,
  });

  const parentMap = new Map(parentLookupQuery.data?.map((item) => [item.id, item.value]) ?? []);

  const createMutation = useMutation({
    mutationFn: (payload: Partial<MasterDataItem>) => masterDataApi.create(payload),
    onSuccess: async () => {
      await invalidateMasterDataQueries();
      toast.success('Entry created.');
      setIsModalOpen(false);
      setCsvFile(null);
      setFormValues({ type: '', value: '', slug: '', description: '', sortOrder: 0, status: 'ACTIVE', parentId: '' });
    },
    onError: (err: unknown) => {
      const message = extractErrorMessage(err);
      toast.error(message);
    },
  });

  const uploadCsvMutation = useMutation({
    mutationFn: (file: File) => masterDataApi.uploadCsv(file),
    onSuccess: async () => {
      await invalidateMasterDataQueries();
      toast.success('CSV uploaded successfully.');
      setIsCsvDialogOpen(false);
      setCsvFile(null);
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Unable to upload CSV file.';
      toast.error(message);
    },
  });

const handleCreate = () => {
  if (!formValues.type || !formValues.value || !formValues.slug || !formValues.status) {
    toast.error("Type, value, slug and status are required.");
    return;
  }

  if (
    (formValues.type === 'LOCATION_STATE' || formValues.type === 'LOCATION_CITY' || formValues.type === 'SPECIALIZATION') &&
    !formValues.parentId
  ) {
    toast.error(
      formValues.type === 'SPECIALIZATION'
        ? 'Education is required.'
        : `${formValues.type === 'LOCATION_STATE' ? 'Country' : 'State'} is required.`
    );
    return;
  }

  if (editItem) {
    const payload: Partial<MasterDataItem> = {
      value: formValues.value,
      slug: formValues.slug,
      description: formValues.description || null,
      sortOrder: formValues.sortOrder ?? 0,
      status: formValues.status,
    };

    if (
      formValues.type === 'LOCATION_STATE' ||
      formValues.type === 'LOCATION_CITY' ||
      formValues.type === 'SPECIALIZATION'
    ) {
      payload.parentId = formValues.parentId || null;
    }

    updateMutation.mutate({
      id: editItem.id,
      payload,
    });
  } else {
    const createPayload: Partial<MasterDataItem> = {
      type: formValues.type,
      value: formValues.value,
      slug: formValues.slug,
      description: formValues.description || null,
      sortOrder: formValues.sortOrder ?? 0,
      status: formValues.status,
    };

    if (formValues.parentId) {
      createPayload.parentId = formValues.parentId;
    }

    createMutation.mutate(createPayload);
  }
};

  const handleUploadCsv = () => {
    if (!csvFile) {
      toast.error('Please select a CSV file first.');
      return;
    }

    uploadCsvMutation.mutate(csvFile);
  };

const handleEdit = (item: MasterDataItem) => {
  setEditItem(item);

  setFormValues({
    type: item.type,
    value: item.value,
    slug: item.slug,
    description: item.description ?? "",
    sortOrder: item.sortOrder ?? 0,
    status: normalizeMasterDataStatus((item as any).status) || "DRAFT",
    parentId: (item as any).parentId || '',
  });

  setIsModalOpen(true);
};

const updateMutation = useMutation({
  mutationFn: ({
    id,
    payload,
  }: {
    id: string;
    payload: Partial<MasterDataItem>;
  }) => masterDataApi.update(id, payload),

  onSuccess: async () => {
    await invalidateMasterDataQueries();
    toast.success("Entry updated.");
    setIsModalOpen(false);
    setEditItem(null);
    setFormValues({
      type: "",
      value: "",
      slug: "",
      description: "",
      sortOrder: 0,
      status: 'ACTIVE',
      parentId: '',
    });
  },

  onError: (err: unknown) => {
    const message = extractErrorMessage(err);
    toast.error(message);
  },
});

const handleOpenAddDialog = () => {
  setIsModalOpen(true);
};

  const handleCloseDialog = () => {
    setIsModalOpen(false);
    setEditItem(null);
    setFormValues({
      type: "",
      value: "",
      slug: "",
      description: "",
      sortOrder: 0,
      status: 'ACTIVE',
      parentId: '',
    });
  };

  const handleOpenCsvDialog = () => {
    setIsCsvDialogOpen(true);
  };

  const handleCloseCsvDialog = () => {
    setIsCsvDialogOpen(false);
    setCsvFile(null);
  };

const deleteMutation = useMutation({
  mutationFn: (id: string) => masterDataApi.delete(id),
  onSuccess: async (_, deletedId) => {
    queryClient.setQueryData(["master-data", page, limit, searchTerm, selectedType, selectedStatus], (old: any) => {
      if (!old) return old;
      return {
        ...old,
        items: old.items.filter((item: any) => item.id !== deletedId),
        total: old.total - 1,
      };
    });
    await invalidateMasterDataQueries();
    toast.success("Entry deleted.");
    setDeleteItem(null);
  },
  onError: (err: unknown) => {
    const message =
      err instanceof Error ? err.message : "Unable to delete entry.";
    toast.error(message);
    setDeleteItem(null);
  },
});

  const columns: Column<MasterDataItem>[] = [
    {
      key: "value",
      header: "Value",
      render: (m) => (
        <span className="font-medium text-card-foreground">{m.value}</span>
      ),
    },
    {
      key: "type",
      header: "Type",
      render: (m) => (
        <span className="text-xs capitalize font-mono">
          {m.type.replace(/_/g, " ").toLowerCase()}
        </span>
      ),
    },
    {
      key: "parent",
      header: "Parent",
      render: (m) => (
        <span className="text-sm text-card-foreground">
          {m.parentId ? parentMap.get(m.parentId) ?? '-' : '-'}
        </span>
      ),
    },
    {
      key: "slug",
      header: "Slug",
      render: (m) => (
        <span className="text-xs font-mono text-muted-foreground">
          {m.slug}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (m) => {
        const status = normalizeMasterDataStatus((m as any).status);

        const variant = status === "ACTIVE" ? "active" : "inactive";

        return <StatusBadge status={status} variant={variant} />;
      },
    },
    {
      key: "sortOrder",
      header: "Order",
      render: (m) => <span className="font-mono text-sm">{m.sortOrder}</span>,
    },
    {
      key: "actions",
      header: "",
      render: (m) => (
        <div className="flex gap-1 justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => handleEdit(m)}
          >
            Edit
          </Button>

          {/* <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-destructive"
            onClick={() => setDeleteItem(m)}
          >
            Delete
          </Button> */}
        </div>
      ),
      className: "text-right",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Master Data</h2>
        <p className="text-sm text-muted-foreground">
          Manage categories, skills, locations, and other reference data.
        </p>
      </div>
      <DataTable
        columns={columns}
        data={data?.items || []}
        total={data?.total ?? 0}
        page={page}
        limit={limit}
        loading={isLoading}
        onPageChange={setPage}
        searchPlaceholder="Search master data..."
        searchValue={searchTerm}
        onSearch={(value) => {
          setSearchTerm(value);
          setPage(1);
        }}
        actions={
          <div className="flex gap-2">
            <select
              aria-label="Filter by master data type"
              className="h-8 rounded-md border border-input bg-background px-3 text-xs"
              value={selectedType}
              onChange={(event) => {
                setSelectedType(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All Types</option>
              {MASTER_DATA_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type.replace(/_/g, " ")}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter by master data status"
              className="h-8 rounded-md border border-input bg-background px-3 text-xs"
              value={selectedStatus}
              onChange={(event) => {
                setSelectedStatus(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All Status</option>
              {MASTER_DATA_STATUS_FILTER_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              className="h-8 text-xs"
              onClick={handleOpenAddDialog}
            >
              Add Entry
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs"
              onClick={handleOpenCsvDialog}
            >
              Upload CSV
            </Button>
          </div>
        }
      />

      <Dialog
        open={isModalOpen}
        onOpenChange={(open) => !open && handleCloseDialog()}
      >
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>
              {editItem ? "Edit Master Data Entry" : "Add Master Data Entry"}
            </DialogTitle>
            <DialogDescription>
              {editItem
                ? "Update the editable fields below and click Save."
                : "Fill the form below and click Save to insert a single master data entry."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            <div>
              <Label htmlFor="md-type">Type*</Label>
              <select
                id="md-type"
                className={`w-full rounded-md border border-input bg-background px-3 py-2 text-sm ${
                  editItem
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : ""
                }`}
                value={formValues.type}
                disabled={!!editItem}
                onChange={(event) =>
                  !editItem &&
                  setFormValues((prev) => ({
                    ...prev,
                    type: event.target.value,
                    parentId: '',
                  }))
                }
              >
                <option value="">Select type</option>
                {MASTER_DATA_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="md-value">Value*</Label>
              <Input
                id="md-value"
                value={formValues.value}
                onChange={(event) =>
                  setFormValues((prev) => ({
                    ...prev,
                    value: event.target.value,
                  }))
                }
              />
            </div>

            {(formValues.type === 'LOCATION_STATE' || formValues.type === 'LOCATION_CITY' || formValues.type === 'SPECIALIZATION') && (
              <div>
                <Label htmlFor="md-parent">
                  {formValues.type === 'LOCATION_STATE'
                    ? 'Country*'
                    : formValues.type === 'LOCATION_CITY'
                    ? 'State*'
                    : 'Education*'}
                </Label>
                <select
                  id="md-parent"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formValues.parentId}
                  onChange={(event) =>
                    setFormValues((prev) => ({
                      ...prev,
                      parentId: event.target.value,
                    }))
                  }
                >
                  <option value="">
                    Select {formValues.type === 'LOCATION_STATE' ? 'country' : formValues.type === 'LOCATION_CITY' ? 'state' : 'education'}
                  </option>
                  {(formValues.type === 'LOCATION_STATE'
                    ? countriesQuery.data?.items
                    : formValues.type === 'LOCATION_CITY'
                    ? statesQuery.data?.items
                    : educationQuery.data
                  )?.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.value}
                    </option>
                  ))}
                </select>
                {((formValues.type === 'LOCATION_STATE' && countriesQuery.isLoading) ||
                  (formValues.type === 'LOCATION_CITY' && statesQuery.isLoading) ||
                  (formValues.type === 'SPECIALIZATION' && educationQuery.isLoading)) && (
                  <p className="text-xs text-muted-foreground mt-1">Loading parent options...</p>
                )}
              </div>
            )}

            <div>
              <Label htmlFor="md-slug">Slug*</Label>
              <Input
                id="md-slug"
                value={formValues.slug}
                onChange={(event) =>
                  setFormValues((prev) => ({
                    ...prev,
                    slug: event.target.value,
                  }))
                }
              />
            </div>

            <div>
              <Label htmlFor="md-description">Description</Label>
              <Input
                id="md-description"
                value={formValues.description}
                onChange={(event) =>
                  setFormValues((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
              />
            </div>

            <div>
              <Label htmlFor="md-sort-order">Order</Label>
              <Input
                id="md-sort-order"
                type="number"
                value={formValues.sortOrder}
                onChange={(event) =>
                  setFormValues((prev) => ({
                    ...prev,
                    sortOrder: Number(event.target.value) || 0,
                  }))
                }
              />
            </div>

            <div>
              <Label htmlFor="md-status">Status</Label>
              <select
                id="md-status"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formValues.status}
                onChange={(event) =>
                  setFormValues((prev) => ({
                    ...prev,
                    status: event.target.value,
                  }))
                }
              >
                <option value="">Select status</option>
                {MASTER_DATA_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {formatStatusLabel(status)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="ghost" size="sm" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={createMutation.isLoading || updateMutation.isLoading}
            >
              {createMutation.isLoading || updateMutation.isLoading
                ? "Saving..."
                : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isCsvDialogOpen}
        onOpenChange={(open) => !open && handleCloseCsvDialog()}
      >
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between pr-6">
              <span>Upload Master Data CSV</span>

              <a
                href="/master-data-upload-sample.csv"
                download="master-data-upload-sample.csv"
                title="Download sample CSV template"
                className="inline-flex items-center gap-1 text-xs font-normal text-primary-foreground bg-primary hover:bg-primary/90 transition-colors rounded-md px-2 py-1"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 5v14" />
                  <path d="m19 12-7 7-7-7" />
                  <line x1="5" y1="21" x2="19" y2="21" />
                </svg>
                Sample Template
              </a>
            </DialogTitle>
          </DialogHeader>

          <DialogDescription>
            Upload a CSV file to add multiple master data entries at once.
            Use <span className="font-medium">parentSlug</span> and <span className="font-medium">parentType</span> for hierarchical entries like SPECIALIZATION.
          </DialogDescription>

          <div className="space-y-4 mt-4">
            <Label htmlFor="csv-file">CSV File</Label>
            <Input
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={(event) => setCsvFile(event.target.files?.[0] ?? null)}
            />
          </div>
          <DialogFooter className="mt-6">
            <Button variant="ghost" size="sm" onClick={handleCloseCsvDialog}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleUploadCsv}
              disabled={!csvFile || uploadCsvMutation.isLoading}
            >
              {uploadCsvMutation.isLoading ? "Uploading..." : "Upload CSV"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteItem}
        title="Delete Entry"
        description={`Are you sure you want to delete "${deleteItem?.value}"?`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => deleteItem && deleteMutation.mutate(deleteItem.id)}
        onCancel={() => setDeleteItem(null)}
      />
    </div>
  );
}
