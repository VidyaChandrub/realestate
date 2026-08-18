import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { broadcastsApi } from "@/api/broadcasts";
import { ReadOnlyMultiSelectField } from "./ReadOnlyMultiSelectField";
import type { Broadcast, BroadcastTargetingSummaryItem } from "../types";

function summaryValues(
  summary: Record<string, BroadcastTargetingSummaryItem[]> | null | undefined,
  keys: string[],
  fallback?: string[] | null,
): string[] {
  if (summary) {
    for (const key of keys) {
      const items = summary[key];
      if (Array.isArray(items) && items.length > 0) {
        return items.map((item) => item.name);
      }
    }
  }
  return fallback ?? [];
}

function getTargetingFields(broadcast: Broadcast) {
  const summary = broadcast.targetingSummary;
  const rules = broadcast.targetingRules;

  return [
    { label: "Country", values: summaryValues(summary, ["country", "countries"], rules?.countryIds) },
    { label: "State", values: summaryValues(summary, ["state", "states"], rules?.stateIds) },
    { label: "City", values: summaryValues(summary, ["city", "cities"], rules?.cityIds) },
    { label: "Skills", values: summaryValues(summary, ["skill", "skills"], rules?.skillIds) },
    {
      label: "Experience Level",
      values: summaryValues(summary, ["experienceLevel", "experienceLevels"], rules?.experienceLevelIds),
    },
    {
      label: "Education",
      values: summaryValues(summary, ["education", "educationLevel", "educationLevels"], rules?.educationLevelIds),
    },
    {
      label: "Specialization",
      values: summaryValues(summary, ["specialization", "specializations"], rules?.specializationIds),
    },
    {
      label: "Year of Passing",
      values: summaryValues(summary, ["yearOfPassing", "yearsOfPassing"], rules?.yearOfPassing),
    },
  ];
}

interface BroadcastDetailsDialogProps {
  broadcastId: string | null;
  onClose: () => void;
}

export function BroadcastDetailsDialog({ broadcastId, onClose }: BroadcastDetailsDialogProps) {
  const open = Boolean(broadcastId);

  const { data: broadcast, isLoading } = useQuery({
    queryKey: ["broadcast-details", broadcastId],
    queryFn: () => broadcastsApi.getById(broadcastId as string),
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Broadcast Details</DialogTitle>
          <DialogDescription>Read-only summary of this broadcast.</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        ) : !broadcast ? (
          <p className="text-sm text-muted-foreground text-center py-6">Broadcast not found.</p>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="broadcast-details-title">Title</Label>
              <Input id="broadcast-details-title" value={broadcast.title} readOnly />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="broadcast-details-message">Description</Label>
              <Textarea id="broadcast-details-message" value={broadcast.message} rows={4} readOnly />
            </div>

            {broadcast.actionUrl && (
              <div className="grid gap-2">
                <Label htmlFor="broadcast-details-action-url">View Details URL</Label>
                <Input id="broadcast-details-action-url" value={broadcast.actionUrl} readOnly />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Status</p>
                <StatusBadge status={broadcast.status} />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Recipients</p>
                <p className="text-sm text-card-foreground">{broadcast.recipientCount ?? 0}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Success</p>
                <p className="text-sm text-card-foreground">{broadcast.successCount ?? 0}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Failed</p>
                <p className="text-sm text-card-foreground">{broadcast.failureCount ?? 0}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Created</p>
                <p className="text-sm text-card-foreground">{new Date(broadcast.createdAt).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Sent</p>
                <p className="text-sm text-card-foreground">
                  {broadcast.sentAt ? new Date(broadcast.sentAt).toLocaleDateString() : "—"}
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-3">Targeting</h4>
              <div className="grid gap-4 sm:grid-cols-2">
                {getTargetingFields(broadcast).map((field) => (
                  <ReadOnlyMultiSelectField key={field.label} label={field.label} values={field.values} />
                ))}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
