import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Code2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface HtmlEditorProps {
  value: string;
  onChange: (value: string) => void;
  adType: 'banner' | 'card';
  disabled?: boolean;
}

/**
 * HTML Editor Component
 * Allows users to write custom HTML for advertisement layout
 * Includes syntax highlighting via placeholder and helper text
 */
export function HtmlEditor({ value, onChange, adType, disabled }: HtmlEditorProps) {
  const dimensions = adType === 'banner' ? '16:9 (Recommended: 1920x1080px)' : '1:1 (Recommended: 1080x1080px)';
  const ratioClass = adType === 'banner' ? 'aspect-video' : 'aspect-square';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Code2 className="h-4 w-4 text-muted-foreground" />
          <Label htmlFor="html-content" className="font-semibold">
            Custom HTML Layout
            <span className="text-destructive"> *</span>
          </Label>
        </div>
        <Badge variant="outline" className="text-[10px] uppercase font-bold text-primary border-primary/20 bg-primary/5">
          Restricted to {dimensions}
        </Badge>
      </div>
      
      <div className="flex flex-col gap-0 overflow-hidden rounded-xl border border-border shadow-sm">
        {/* Opening Tag */}
        <div className="bg-muted/50 px-4 py-2 border-b border-border">
          <code className="text-[10px] text-muted-foreground font-mono">
            &lt;div class="ad-container {ratioClass} w-full overflow-hidden"&gt;
          </code>
        </div>

        <Textarea
          id="html-content"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`  <div class="p-6 flex flex-col justify-center h-full">
    <h2 class="text-2xl font-bold">Your Ad Title</h2>
    <p class="mt-2">Your ad description goes here.</p>
    <button class="mt-4 bg-primary text-white px-4 py-2 rounded">Apply Now</button>
  </div>`}
          className="min-h-[250px] border-0 focus-visible:ring-0 rounded-none font-mono text-sm bg-white p-4"
          disabled={disabled}
        />

        {/* Closing Tag */}
        <div className="bg-muted/50 px-4 py-2 border-t border-border">
          <code className="text-[10px] text-muted-foreground font-mono">
            &lt;/div&gt;
          </code>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-amber-50/30 p-3 text-xs">
        <p className="mb-2 font-semibold text-amber-900">Important Implementation Details:</p>
        <ul className="list-inside space-y-1 text-amber-800/80">
          <li>• Your content will be automatically wrapped in a <strong>{adType === 'banner' ? '16:9' : '1:1'}</strong> container.</li>
          <li>• Use Tailwind CSS classes for styling (e.g., <code className="bg-amber-100/50 px-1 rounded">text-primary</code>, <code className="bg-amber-100/50 px-1 rounded">p-4</code>).</li>
          <li>• Ensure your content is responsive within the fixed container.</li>
        </ul>
      </div>
    </div>
  );
}
