import { useState, useEffect, useRef } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Option {
  id: string;
  value: string;
}

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
  label?: string;
  isLoading?: boolean;
  onSearch?: (value: string) => void;
}

export const SearchableSelect = ({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  disabled = false,
  label,
  isLoading = false,
  onSearch,
}: SearchableSelectProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    } else {
      setSearch('');
      onSearch?.('');
    }
  }, [open]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (onSearch) {
      onSearch(value);
    }
  };

  const filteredOptions = onSearch
    ? options // When using server-side search, show all provided options
    : options.filter((option) =>
        option.value.toLowerCase().includes(search.toLowerCase())
      );

  const selectedOption = options.find((option) => option.id === value);

  return (
    <div className="space-y-2">
      {label ? <label className="text-sm font-medium">{label}</label> : null}
      <Popover open={!disabled && open} onOpenChange={setOpen}>
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
              {selectedOption ? selectedOption.value : placeholder}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <div className="max-w-full">
            {isLoading ? (
              <div className="p-4 text-sm text-muted-foreground">Loading...</div>
            ) : (
              <div className="p-4 space-y-2">
                <Input
                  ref={inputRef}
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="mb-2"
                />
                {filteredOptions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {onSearch && !search
                      ? 'Type to search...'
                      : search
                        ? 'No results found'
                        : 'No options available'}
                  </p>
                ) : (
                  <div
                    className="space-y-1 max-h-60 overflow-y-auto"
                    onWheel={(e) => {
                      e.stopPropagation();
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                    }}
                    style={{ overscrollBehavior: 'contain' }}
                  >
                    {filteredOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          onChange(option.id);
                          setOpen(false);
                        }}
                        className={cn(
                          'w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent/80 hover:text-accent-foreground',
                          value === option.id ? 'bg-accent/20 font-medium' : 'bg-transparent'
                        )}
                      >
                        {option.value}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
