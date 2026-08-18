import { useRef, useState, type ChangeEvent } from 'react';
import { Building2, Loader2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { employersApi } from '@/api/services';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

const ACCEPTED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const MAX_LOGO_SIZE_MB = 2;

interface OrganizationLogoUploadProps {
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  disabled?: boolean;
}

function getUploadErrorMessage(error: unknown, fallback: string): string {
  const message = (error as { response?: { data?: { message?: unknown } } })?.response?.data?.message;

  if (typeof message === 'string' && message.trim()) {
    return message;
  }

  if (Array.isArray(message)) {
    const parts = message.filter((item): item is string => typeof item === 'string' && item.trim());
    if (parts.length > 0) return parts.join(', ');
  }

  return fallback;
}

export function OrganizationLogoUpload({ value, onChange, disabled }: OrganizationLogoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const isDisabled = Boolean(disabled) || uploading;

  const handleFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!ACCEPTED_LOGO_TYPES.includes(file.type)) {
      toast.error('Only PNG, JPG, JPEG or WEBP images are supported.');
      return;
    }

    if (file.size > MAX_LOGO_SIZE_MB * 1024 * 1024) {
      toast.error(`Logo image must be ${MAX_LOGO_SIZE_MB} MB or smaller.`);
      return;
    }

    setUploading(true);
    try {
      const result = await employersApi.uploadLogo(file);
      onChange(result.url);
    } catch (error) {
      toast.error(getUploadErrorMessage(error, 'Failed to upload logo. Please try again.'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label>Organization Logo</Label>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_LOGO_TYPES.join(',')}
        className="hidden"
        onChange={handleFileSelect}
        disabled={isDisabled}
      />
      <div className="flex items-center gap-4">
        {value ? (
          <img src={value} alt="Organization logo" className="h-16 w-16 rounded-lg border object-cover" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed bg-muted/30">
            <Building2 className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isDisabled}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                {value ? 'Change Logo' : 'Upload Logo'}
              </>
            )}
          </Button>
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isDisabled}
              onClick={() => onChange(null)}
            >
              <X className="mr-2 h-4 w-4" />
              Remove Logo
            </Button>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        PNG, JPG, JPEG or WEBP. Maximum file size: {MAX_LOGO_SIZE_MB} MB.
      </p>
    </div>
  );
}
