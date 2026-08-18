import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Eye } from 'lucide-react';
import { DataTable, type Column } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { broadcastsApi } from '@/api/broadcasts';
import { SendBroadcastModal } from './components/SendBroadcastModal';
import { BroadcastDetailsDialog } from './components/BroadcastDetailsDialog';
import type { Broadcast } from './types';

export default function NotificationsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isSendModalOpen, setSendModalOpen] = useState(false);
  const [selectedBroadcastId, setSelectedBroadcastId] = useState<string | null>(null);
  const limit = 10;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['broadcasts', page, limit, search],
    queryFn: () => broadcastsApi.list({ page, limit, search: search || undefined }),
    placeholderData: (previous) => previous,
  });

  const broadcasts = data?.data ?? [];
  const total = data?.total ?? 0;

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const columns: Column<Broadcast>[] = [
    {
      key: 'title',
      header: 'Title',
      render: (b) => (
        <div>
          <p className="font-medium text-card-foreground">{b.title}</p>
          <p className="text-xs text-muted-foreground line-clamp-1">{b.message}</p>
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: (b) => <StatusBadge status={b.status} /> },
    { key: 'recipientCount', header: 'Recipients', render: (b) => <span>{b.recipientCount ?? 0}</span> },
    { key: 'successCount', header: 'Sent', render: (b) => <span>{b.successCount ?? 0}</span> },
    { key: 'failureCount', header: 'Failed', render: (b) => <span>{b.failureCount ?? 0}</span> },
    {
      key: 'createdAt',
      header: 'Created At',
      render: (b) => <span className="text-xs text-muted-foreground">{new Date(b.createdAt).toLocaleDateString()}</span>,
    },
    {
      key: 'details',
      header: 'Details',
      render: (b) => (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setSelectedBroadcastId(b.id)}
          aria-label="View broadcast details"
        >
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Notifications</h2>
        <p className="text-sm text-muted-foreground">System notifications and admin broadcasts.</p>
      </div>
      <DataTable
        columns={columns}
        data={broadcasts}
        total={total}
        page={page}
        limit={limit}
        onPageChange={setPage}
        loading={isLoading}
        searchPlaceholder="Search broadcasts..."
        searchValue={search}
        onSearchChange={handleSearchChange}
        emptyMessage="No broadcasts have been sent yet."
        actions={
          <Button size="sm" className="h-8 text-xs" onClick={() => setSendModalOpen(true)}>
            Send Broadcast
          </Button>
        }
      />

      <SendBroadcastModal
        open={isSendModalOpen}
        onClose={() => setSendModalOpen(false)}
        onSuccess={() => {
          setSendModalOpen(false);
          refetch();
        }}
      />

      <BroadcastDetailsDialog
        broadcastId={selectedBroadcastId}
        onClose={() => setSelectedBroadcastId(null)}
      />
    </div>
  );
}
