import { useState, type ReactNode } from 'react';
import { Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface FilterPanelProps {
  activeCount?: number;
  onApply: () => void;
  onReset: () => void;
  applyDisabled?: boolean;
  children: ReactNode;
  className?: string;
}

export function FilterPanel({
  activeCount = 0,
  onApply,
  onReset,
  applyDisabled,
  children,
  className,
}: FilterPanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" />
          Filter
          {activeCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
              {activeCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn("w-80 p-0 flex flex-col overflow-hidden", className)}
        style={{ maxHeight: 'calc(100vh - 80px)' }}
        align="end"
        collisionPadding={10}
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-2 flex-shrink-0">
          <h4 className="font-medium">Filter</h4>
          <Button variant="ghost" size="icon" onClick={() => setOpen(false)} className="h-7 w-7">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 space-y-4 min-h-0 pb-2">
          {children}
        </div>
        <div className="flex gap-2 px-4 py-3 border-t flex-shrink-0">
          <Button variant="ghost" className="flex-1" onClick={onReset} disabled={applyDisabled}>
            Reset all
          </Button>
          <Button className="flex-1" onClick={() => { onApply(); setOpen(false); }} disabled={applyDisabled}>
            Apply Now
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
