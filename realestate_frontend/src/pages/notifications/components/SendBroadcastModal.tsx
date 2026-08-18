import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { broadcastsApi } from "@/api/broadcasts";
import { useBroadcastTargeting } from "../hooks/useBroadcastTargeting";
import { BroadcastTargetingFields } from "./BroadcastTargetingFields";

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function getApiErrorMessage(error: unknown, fallback: string): string {
  const data = (error as { response?: { data?: { message?: unknown } } })?.response?.data;
  const message = data?.message;

  if (typeof message === "string" && message.trim()) {
    return message;
  }

  if (Array.isArray(message)) {
    const parts = message.filter((item): item is string => typeof item === "string" && item.trim());
    if (parts.length > 0) {
      return parts.join(". ");
    }
  }

  return fallback;
}

interface SendBroadcastModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function SendBroadcastModal({ open, onClose, onSuccess }: SendBroadcastModalProps) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [actionUrl, setActionUrl] = useState("");
  const [errors, setErrors] = useState<{ title?: string; message?: string; actionUrl?: string }>({});
  const targeting = useBroadcastTargeting();

  const resetForm = () => {
    setTitle("");
    setMessage("");
    setActionUrl("");
    setErrors({});
    targeting.reset();
  };

  const sendMutation = useMutation({
    mutationFn: () =>
      broadcastsApi.create({
        title: title.trim(),
        message: message.trim(),
        actionUrl: actionUrl.trim() || undefined,
        targetingRules: targeting.targetingRules,
      }),
    onSuccess: () => {
      toast.success("Broadcast sent successfully!");
      resetForm();
      onSuccess();
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to send broadcast."));
    },
  });

  const handleClose = () => {
    if (sendMutation.isPending) return;
    resetForm();
    onClose();
  };

  const handleSend = () => {
    const nextErrors: { title?: string; message?: string; actionUrl?: string } = {};
    if (!title.trim()) nextErrors.title = "Title is required.";
    if (!message.trim()) nextErrors.message = "Description is required.";
    if (actionUrl.trim() && !isValidHttpUrl(actionUrl.trim())) {
      nextErrors.actionUrl = "View Details URL must be a valid URL starting with http:// or https://.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    sendMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send Broadcast</DialogTitle>
          <DialogDescription>
            Send a notification to users matching the selected targeting criteria. Leave targeting fields empty to reach everyone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="broadcast-title">
              Title<span className="text-destructive"> *</span>
            </Label>
            <Input
              id="broadcast-title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setErrors((prev) => ({ ...prev, title: undefined }));
              }}
              placeholder="Enter broadcast title"
              disabled={sendMutation.isPending}
            />
            {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="broadcast-message">
              Description<span className="text-destructive"> *</span>
            </Label>
            <Textarea
              id="broadcast-message"
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                setErrors((prev) => ({ ...prev, message: undefined }));
              }}
              placeholder="Enter broadcast message"
              rows={4}
              disabled={sendMutation.isPending}
            />
            {errors.message && <p className="text-xs text-destructive">{errors.message}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="broadcast-action-url">View Details URL</Label>
            <Input
              id="broadcast-action-url"
              value={actionUrl}
              onChange={(e) => {
                setActionUrl(e.target.value);
                setErrors((prev) => ({ ...prev, actionUrl: undefined }));
              }}
              placeholder="Enter URL for View Details (optional)"
              disabled={sendMutation.isPending}
            />
            {errors.actionUrl && <p className="text-xs text-destructive">{errors.actionUrl}</p>}
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-3">Targeting </h4>
            <BroadcastTargetingFields targeting={targeting} disabled={sendMutation.isPending} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={sendMutation.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sendMutation.isPending}>
            {sendMutation.isPending ? "Sending..." : "Send Broadcast"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
