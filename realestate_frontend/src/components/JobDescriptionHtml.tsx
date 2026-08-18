import { cn } from '@/lib/utils';
import { sanitizeJobDescriptionHtml } from '@/lib/jobDescriptionHtml';

interface JobDescriptionHtmlProps {
  description: string | null | undefined;
  emptyText?: string;
  className?: string;
}

export function JobDescriptionHtml({ description, emptyText = '-', className }: JobDescriptionHtmlProps) {
  const html = sanitizeJobDescriptionHtml(description);

  if (!html) {
    return <p className={cn('mt-1 text-sm text-muted-foreground', className)}>{emptyText}</p>;
  }

  return (
    <div
      className={cn('job-description-html mt-1 text-sm text-foreground', className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
