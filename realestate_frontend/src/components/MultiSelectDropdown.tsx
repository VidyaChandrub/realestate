import { useState, type ReactNode } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Option {
  id: string;
  value: string;
}

interface MultiSelectDropdownProps {
  label: string;
  /** Optional rich label to render instead of `label` (e.g. to style a required-field asterisk). Falls back to `label` when omitted. */
  labelNode?: ReactNode;
  options: Option[];
  selected: string[];
  onChange: (selected: string[]) => void;
  disabled?: boolean;
  isLoading?: boolean;
  placeholder?: string;
  onOpenChange?: (open: boolean) => void;
  onSearch?: (value: string) => void;
}

export const MultiSelectDropdown = ({
  label,
  labelNode,
  options,
  selected,
  onChange,
  disabled = false,
  isLoading = false,
  placeholder = 'Select items...',
  onOpenChange,
  onSearch,
}: MultiSelectDropdownProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const handleToggle = (optionId: string) => {
    if (selected.includes(optionId)) {
      onChange(selected.filter((id) => id !== optionId));
    } else {
      onChange([...selected, optionId]);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (onSearch) {
      onSearch(value);
    }
  };

  const handleRemove = (optionId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    onChange(selected.filter((id) => id !== optionId));
  };

  const selectedOptions = selected
    .map((id) => options.find((opt) => opt.id === id))
    .filter((option): option is Option => Boolean(option));

  const filteredOptions = onSearch
    ? options // When using server-side search, show all provided options
    : options.filter(opt =>
        opt.value.toLowerCase().includes(search.toLowerCase())
      );

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{labelNode ?? label}</label>
      <Popover
        open={!disabled && open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          onOpenChange?.(nextOpen);
          if (!nextOpen) {
            setSearch('');
            onSearch?.('');
          }
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled || isLoading}
          >
            <span className="truncate text-left">
              {selected.length > 0
                ? `${selected.length} selected`
                : placeholder}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <div className="max-w-full">
            <ScrollArea
              className="max-h-60 overflow-y-auto"
              onWheel={(e) => {
                e.stopPropagation();
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
              }}
              style={{ overscrollBehavior: 'contain' }}
            >
              <div className="p-4 space-y-2">
                <Input
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="mb-2"
                />
                {isLoading ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Loading...
                  </p>
                ) : filteredOptions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {onSearch && !search
                      ? 'Type to search...'
                      : search
                        ? 'No results found'
                        : 'No options available'}
                  </p>
                ) : (
                  filteredOptions.map((option) => (
                    <div key={option.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`${label}-${option.id}`}
                        checked={selected.includes(option.id)}
                        onCheckedChange={() => handleToggle(option.id)}
                      />
                      <label
                        htmlFor={`${label}-${option.id}`}
                        className="text-sm cursor-pointer flex-1"
                      >
                        {option.value}
                      </label>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </PopoverContent>
      </Popover>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          {selectedOptions.map((option) => (
            <Badge key={option.id} variant="secondary" className="gap-1 pr-1">
              {option.value}
              {!disabled && (
                <button
                  type="button"
                  onClick={(e) => handleRemove(option.id, e)}
                  className="ml-1 hover:text-destructive"
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
};
