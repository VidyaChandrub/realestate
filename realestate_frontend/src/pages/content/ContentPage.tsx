import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { contentApi } from '@/api/services';
import { toast } from 'sonner';
import type { ContentPage } from '@/types';

type ContentSlug = 'privacy' | 'help-support';

const SLUGS: { label: string; slug: ContentSlug }[] = [
  { label: 'Privacy Policy', slug: 'privacy' },
  { label: 'Help & Support', slug: 'help-support' },
];

export default function ContentPage() {
  const [activeTab, setActiveTab] = useState<ContentSlug>('privacy');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const queryClient = useQueryClient();

  const activeItem = useMemo(() => SLUGS.find((item) => item.slug === activeTab)!, [activeTab]);

  const { data, isLoading: isLoadingContent, isError } = useQuery<ContentPage>({
    queryKey: ['content', activeTab],
    queryFn: () => contentApi.get(activeTab),
    keepPreviousData: true,
    retry: false,
  });

  useEffect(() => {
    setTitle('');
    setBody('');
  }, [activeTab]);

  useEffect(() => {
    if (data) {
      setTitle(data.title);
      setBody(data.body);
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<ContentPage>) => contentApi.update(activeTab, payload),
    onSuccess: (updated) => {
      toast.success(`${activeItem.label} updated.`);
      queryClient.setQueryData(['content', activeTab], updated);
    },
    onError: () => {
      toast.error('Failed to save content.');
    },
  });

  const canSave = Boolean(title.trim() && body.trim());

  const handleSave = () => {
    updateMutation.mutate({ title: title.trim(), body: body.trim() });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Content pages</h2>
        <p className="text-sm text-muted-foreground">Edit the privacy policy and help & support pages shown in the public application.</p>
        {isError && (
          <p className="text-sm text-destructive">Unable to load existing content. You can create it by saving a new value.</p>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ContentSlug)}>
        <TabsList>
          {SLUGS.map((item) => (
            <TabsTrigger key={item.slug} value={item.slug}>
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab}>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">Title</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={`Enter ${activeItem.label} title`}
                  disabled={isLoadingContent || updateMutation.isLoading}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">Body</label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={`Enter ${activeItem.label} body content`}
                className="min-h-[260px]"
                disabled={isLoadingContent || updateMutation.isLoading}
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  if (data) {
                    setTitle(data.title);
                    setBody(data.body);
                  }
                }}
                disabled={isLoadingContent || updateMutation.isLoading}
              >
                Reset
              </Button>
              <Button
                onClick={handleSave}
                disabled={!canSave || isLoadingContent || updateMutation.isLoading}
              >
                Save
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
