import { useEffect, useMemo } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ArrowLeft, Loader2, Pencil } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { canManageAdvertisements } from "../constants/access-control";
import { AdvertisementPreview } from "../components/previews";
import { CreateAdvertisementForm } from "../components/CreateAdvertisementForm";
import { useAdvertisementFormState } from "../hooks/useAdvertisementFormState";
import { advertisementsApi } from "@/api/advertisements";
import { useSearchParams } from 'react-router-dom';

export default function CreateAdvertisementPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const cloneId = searchParams.get('clone_id');
  const { pathname } = useLocation();
  const formState = useAdvertisementFormState();

  const isEdit = pathname.includes("/edit");
  const isView = !!id && !isEdit;

 const data_id = useMemo(() => {
  return id || cloneId || null;
}, [id, cloneId]);

  const { data: advertisement, isLoading } = useQuery({
    queryKey: ["advertisement", data_id],
    queryFn: () => (data_id ? advertisementsApi.getOne(data_id) : null),
    enabled: !!data_id,
  });

  useEffect(() => {
    if (!canManageAdvertisements() && !isView) {
      navigate("/ads", { replace: true });
    }
  }, [navigate, isView]);

  const { state } = useLocation();
  const republishFrom = state?.republishFrom;

  useEffect(() => {
    if (republishFrom) {
      formState.resetWithData(republishFrom);
    } else if (advertisement) {
      formState.resetWithData(advertisement);
    }
  }, [advertisement, republishFrom]);

  const pageTitle = useMemo(() => {
    if (isView) return "View Advertisement";
    if (isEdit) return "Edit Advertisement";
    return "Create New Advertisement";
  }, [isView, isEdit]);

  const pageDescription = useMemo(() => {
    if (isView) return "View details and preview of the advertisement.";
    if (isEdit) return "Update the details for your advertisement.";
    return "Fill in the details for your advertisement.";
  }, [isView, isEdit]);

  if (id && isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="mt-0.5 shrink-0"
            onClick={() => navigate("/ads")}
            aria-label="Back to advertisements"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              {pageTitle}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {pageDescription}
            </p>
          </div>
        </div>

        {isView && canManageAdvertisements() && (
          <Button 
            className="w-full gap-2 sm:w-auto"
            onClick={() => navigate(`/ads/${id}/edit`)}
          >
            <Pencil className="h-4 w-4" />
            Edit Advertisement
          </Button>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,380px)] xl:grid-cols-[minmax(0,1fr)_420px]">
        <CreateAdvertisementForm 
          onCancel={() => navigate("/ads")} 
          formState={formState} 
          isReadOnly={isView}
          adId={id}

        />
        <aside className="min-h-[200px] lg:min-h-0">
          <div className="sticky top-24 space-y-4">
            <AdvertisementPreview
              adType={formState.adType}
              title={formState.title}
              ctaText={formState.ctaText}
              redirectUrl={formState.redirectUrl}
              format={formState.format}
              imageUrl={formState.previewUrls[0]}
              images={formState.previewUrls}
              htmlContent={formState.htmlContent}
              youtubeUrl={formState.youtubeUrl}
              isLoading={false}
              ctaTextColor={formState.ctaTextColor}
              ctaBackgroundColor={formState.ctaBackgroundColor}
              ctaButtonStyle={formState.ctaButtonStyle}
              ctaButtonSize={formState.ctaButtonSize}
              ctaButtonPlacement={formState.ctaButtonPlacement}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
