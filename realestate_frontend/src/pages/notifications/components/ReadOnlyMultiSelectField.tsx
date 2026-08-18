import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface ReadOnlyMultiSelectFieldProps {
  label: string;
  values: string[];
  emptyText?: string;
}

export function ReadOnlyMultiSelectField({ label, values, emptyText = "All" }: ReadOnlyMultiSelectFieldProps) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <div className="flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-md border border-input bg-muted/30 px-3 py-2">
        {values.length > 0 ? (
          values.map((value, idx) => (
            <Badge key={idx} variant="secondary" className="rounded-md px-1.5 py-0.5 text-[10px] font-medium">
              {value}
            </Badge>
          ))
        ) : (
          <span className="text-sm text-muted-foreground">{emptyText}</span>
        )}
      </div>
    </div>
  );
}
