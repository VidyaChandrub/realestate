import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Compass, Users } from 'lucide-react';
import { OrganizationCreateForm, type OrganizationCreateFormValues } from '@/components/OrganizationCreateForm';
import { employersApi } from '@/api/services';
import { logout } from '@/lib/auth';
import { clearOrganizationOnboardingSkipped, markOrganizationOnboardingSkipped } from '@/lib/organizationOnboarding';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

function buildOrganizationPayload(values: OrganizationCreateFormValues) {
  return {
    name: values.name.trim(),
    description: values.description.trim() || undefined,
    industry: values.industry.trim() || undefined,
    website: values.website.trim() || undefined,
    foundedYear: values.foundedYear ? Number(values.foundedYear) : undefined,
    companySize: values.companySize || undefined,
    type: values.type || undefined,
    contactEmail: values.contactEmail.trim() || undefined,
    contactPhone: values.contactPhone.trim() || undefined,
    country: values.country.trim() || undefined,
    state: values.state.trim() || undefined,
    city: values.city.trim() || undefined,
    address: values.address.trim() || undefined,
    postalCode: values.postalCode.trim() || undefined,
    mission: values.mission.trim() || undefined,
    vision: values.vision.trim() || undefined,
    cultureDescription: values.cultureDescription.trim() || undefined,
    benefits: values.benefits,
    logoUrl: values.logoUrl.trim() || undefined,
  };
}

export default function OnboardingOrganisationPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [mode, setMode] = useState<'create' | 'join' | null>(null);

  const { data: myOrganizations = [] } = useQuery({
    queryKey: ['my-organizations', false, 'onboarding'],
    queryFn: () => employersApi.listMine(),
  });
  const hasOrganization = myOrganizations.length > 0;

  const createOrganizationMutation = useMutation({
    mutationFn: (values: OrganizationCreateFormValues) =>
      employersApi.create(buildOrganizationPayload(values)),
    onSuccess: async () => {
      clearOrganizationOnboardingSkipped(user);
      toast.success('Organization created successfully.');
      await queryClient.invalidateQueries({ queryKey: ['my-organizations'] });
      navigate('/dashboard', { replace: true });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Failed to create organization.';
      toast.error(message);
    },
  });

  const handleLogout = () => {
    logout();
  };

  const handleSkip = () => {
    markOrganizationOnboardingSkipped(user);
    toast.info('Organisation setup skipped for now.');
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <div className="w-full max-w-lg space-y-4">
        <div className="mb-6 text-center">
          <div className="gradient-primary mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg">
            <Compass className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Set Up Your Organization</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create or join an organization before you start posting properties and managing inquiries.
          </p>
          <Button variant="ghost" className="mt-3" onClick={handleSkip}>
            Skip for Now
          </Button>
        </div>

        {!mode && (
          <div className="grid gap-4">
            {!hasOrganization && (
              <Card
                className="cursor-pointer border-2 transition-shadow hover:border-primary/50 hover:shadow-md"
                onClick={() => setMode('create')}
              >
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Create a new organization</h3>
                    <p className="text-sm text-muted-foreground">
                      Set up your company and begin posting properties from this admin panel.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card
              className="cursor-pointer border-2 transition-shadow hover:border-primary/50 hover:shadow-md"
              onClick={() => setMode('join')}
            >
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Join an existing organization</h3>
                  <p className="text-sm text-muted-foreground">
                    Ask an organization owner to invite your account to their team.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {mode === 'join' && (
          <Card>
            <CardHeader>
              <CardTitle>Join an Organization</CardTitle>
              <CardDescription>
                Share your account details with the organization owner so they can add you to their team.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border bg-muted/40 p-4">
                <p className="text-sm font-medium">Share this with your organization admin</p>
                <p className="mt-2 text-sm text-muted-foreground">Email</p>
                <p className="font-mono text-sm">{user?.email || 'Your account email after sign-in'}</p>
                {user?.id && (
                  <>
                    <p className="mt-3 text-sm text-muted-foreground">User ID</p>
                    <p className="break-all font-mono text-sm">{user.id}</p>
                  </>
                )}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setMode(null)}>
                  Back
                </Button>
                <Button variant="secondary" onClick={handleSkip}>
                  Skip for Now
                </Button>
                <Button variant="ghost" onClick={handleLogout}>
                  Sign Out
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {mode === 'create' && !hasOrganization && (
          <Card>
            <CardHeader>
              <CardTitle>Create Organization</CardTitle>
              <CardDescription>Fill in your company details to finish setup.</CardDescription>
            </CardHeader>
            <CardContent>
              <OrganizationCreateForm
                isSubmitting={createOrganizationMutation.isPending}
                onCancel={() => setMode(null)}
                onSubmit={async (values) => {
                  await createOrganizationMutation.mutateAsync(values);
                }}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
