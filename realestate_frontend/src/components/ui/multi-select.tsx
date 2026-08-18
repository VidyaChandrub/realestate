import { useMemo } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import type { MasterDataItem } from "@/types";

interface MultiSelectProps {
  label: string;
  placeholder: string;
  items: MasterDataItem[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}

export function MultiSelect({ label, placeholder, items, selectedIds, onChange, disabled }: MultiSelectProps) {
  const selectedItems = useMemo(
    () => items.filter((i) => selectedIds?.includes(i.id)),
    [items, selectedIds],
  );

  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "justify-between bg-muted/30 font-normal",
              !selectedIds?.length && "text-muted-foreground",
            )}
            disabled={disabled}
          >
            <div className="flex flex-wrap gap-1">
              {selectedIds?.length > 0
                ? `${selectedIds.length} selected`
                : placeholder}
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandInput placeholder={`Search ${label.toLowerCase()}...`} />
            <CommandList
              onWheel={(e) => {
                e.stopPropagation();
              }}
              style={{ overscrollBehavior: "contain" }}
            >
              <CommandEmpty>No {label.toLowerCase()} found.</CommandEmpty>
              <CommandGroup>
                {items.map((item) => (
                  <CommandItem
                    key={item.id}
                    onSelect={() => {
                      if (selectedIds?.includes(item.id)) {
                        onChange(selectedIds?.filter((id) => id !== item.id));
                      } else {
                        onChange([...(selectedIds ?? []), item.id]);
                      }
                    }}
                  >
                    <div
                      className={cn(
                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                        selectedIds?.includes(item.id)
                          ? "bg-primary text-primary-foreground"
                          : "opacity-50 [&_svg]:invisible",
                      )}
                    >
                      <Check className={cn("h-4 w-4")} />
                    </div>
                    <span>{item.value}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selectedItems.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {selectedItems.map((item) => (
            <Badge
              key={item.id}
              variant="secondary"
              className="rounded-md px-1.5 py-0.5 text-[10px] font-medium"
            >
              {item.value}
              {!disabled && (
                <button
                  className="ml-1 rounded-full outline-none hover:bg-muted-foreground/20"
                  onClick={() => onChange(selectedIds.filter((id) => id !== item.id))}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
