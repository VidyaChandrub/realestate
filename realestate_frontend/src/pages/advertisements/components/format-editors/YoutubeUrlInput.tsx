import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Youtube, AlertCircle } from "lucide-react";

interface YoutubeUrlInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

/**
 * YouTube URL Input Component
 * Allows users to provide YouTube video URL for advertisement
 * Validates and extracts video ID from various YouTube URL formats
 */
export function YoutubeUrlInput({ value, onChange, disabled }: YoutubeUrlInputProps) {
  const extractVideoId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,  // ← added
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) return match[1];
  }
  return null;
};

  const videoId = extractVideoId(value);
  const isValidUrl = !value || videoId !== null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Youtube className="h-4 w-4 text-red-600" />
        <Label htmlFor="youtube-url">
          YouTube Video/Shorts URL
          <span className="text-destructive"> *</span>
        </Label>
      </div>
      <p className="text-xs text-muted-foreground">
        Paste the YouTube video URL. Supported formats: youtube.com/watch?v=..., youtu.be/..., or embed URLs.
      </p>
      <div className="space-y-2">
        <Input
          id="youtube-url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
          className={`bg-muted/30 ${!isValidUrl ? "border-destructive" : ""}`}
          disabled={disabled}
        />
        {!isValidUrl && value && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Invalid YouTube URL format</span>
          </div>
        )}
        {videoId && (
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="mb-2 text-xs font-semibold text-muted-foreground">Preview:</p>
            <div className="aspect-video overflow-hidden rounded-lg bg-gray-900">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${videoId}`}
                title="YouTube video preview"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="border-0"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
