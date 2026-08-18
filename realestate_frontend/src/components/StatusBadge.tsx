import { cn } from '@/lib/utils';

type BadgeVariant = 'active' | 'inactive' | 'pending' | 'rejected' | 'draft' | 'success' | 'warning' | 'info';

const variantStyles: Record<BadgeVariant, string> = {
  active: 'bg-success/10 text-success border-success/20',
  inactive: 'bg-muted text-muted-foreground border-border',
  pending: 'bg-warning/10 text-warning border-warning/20',
  rejected: 'bg-destructive/10 text-destructive border-destructive/20',
  draft: 'bg-muted text-muted-foreground border-border',
  success: 'bg-success/10 text-success border-success/20',
  warning: 'bg-warning/10 text-warning border-warning/20',
  info: 'bg-primary/10 text-primary border-primary/20',
};

interface StatusBadgeProps {
  status: string;
  variant?: BadgeVariant;
  className?: string;
}

export function StatusBadge({ status, variant, className }: StatusBadgeProps) {
  const inferredVariant: BadgeVariant = variant || inferVariant(status);
  return (
    <span className={cn(
      'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize',
      variantStyles[inferredVariant],
      className
    )}>
      {formatLabel(status)}
    </span>
  );
}

function formatLabel(status: string): string {
  if (status.toLowerCase() === 'no_recipients') return 'No Recipients';
  if (status.toLowerCase() === 'hired') return 'Closed';
  return status;
}

function inferVariant(status: string): BadgeVariant {
  const s = status.toLowerCase();
  if (['active', 'verified', 'approved', 'hired', 'completed'].includes(s)) return 'active';
  if (['inactive', 'suspended', 'archived', 'cancelled'].includes(s)) return 'inactive';
  if (['pending', 'draft', 'reviewed'].includes(s)) return 'pending';
  if (['rejected'].includes(s)) return 'rejected';
  if (s === 'no_recipients') return 'warning';
  return 'info';
}
