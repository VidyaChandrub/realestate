import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import { AuthProvider } from "@/auth/AuthProvider";
import { AuthGuard, EmployerOrganizationGuard } from "@/auth/AuthGuard";
import { AppLayout } from "@/layout/AppLayout";
import { Loader2 } from "lucide-react";
import NotFound from "./pages/NotFound";
import AdvertisementClicksPage from "./pages/advertisements/pages/AdvertisementClicksPage";
import Landing from "./pages/Landing";
import AuthCallback from "./pages/AuthCallback";
import ResetPassword from "./pages/ResetPassword";
import VerifyEmail from "./pages/VerifyEmail";
const DashboardPage = lazy(() => import("./pages/dashboard/DashboardPage"));
const UsersPage = lazy(() => import("./pages/users/UsersPage"));
const EmployersPage = lazy(() => import("./pages/employers/EmployersPage"));
const EmployerDetailsPage = lazy(() => import("./pages/employers/EmployerDetailsPage"));
const JobsPage = lazy(() => import("./pages/jobs/JobsPage"));
const JobViewPage = lazy(() => import("./pages/jobs/JobViewPage"));
const JobFormPage = lazy(() => import("./pages/jobs/JobFormPage"));
const EventsPage = lazy(() => import("./pages/events/EventsPage"));
const EventForm = lazy(() => import("./pages/events/EventForm"));
const CampaignsPage = lazy(() => import("./pages/advertisements"));
const CreateAdvertisementPage = lazy(() => import("./pages/advertisements/pages/CreateAdvertisementPage"));
const EventRegistrationsPage = lazy(() => import("./pages/events/EventRegistrationsPage"));
const EventExternalClicksPage = lazy(() => import("./pages/events/EventExternalClicksPage"));
const MasterDataPage = lazy(() => import("./pages/master-data/MasterDataPage"));
const OthersSpecializationsReportPage = lazy(() => import("./pages/reports/OthersSpecializationsReportPage"));
const AnalyticsPage = lazy(() => import("./pages/analytics/AnalyticsPage"));
const NotificationsPage = lazy(() => import("./pages/notifications/NotificationsPage"));
const ContentPage = lazy(() => import("./pages/content/ContentPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage.tsx"));
const OnboardingOrganisationPage = lazy(() => import("./pages/onboarding/OrganisationPage"));
const OrganisationPage = lazy(() => import("./pages/organisation/OrganisationPage"));
const JobApplicationsPage = lazy(() => import("./pages/jobs/JobApplicationsPage"));
const JobExternalClicksPage = lazy(() => import("./pages/jobs/JobExternalClicksPage"));

const queryClient = new QueryClient();

function PageLoader() {
  return (
    <div className="flex h-64 items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route
              path="/"
              element={<Landing />}
            />
            <Route
              path="/auth"
              element={<Landing />}
            />
            <Route
              path="/auth/callback"
              element={<AuthCallback />}
            />
            <Route
              path="/verify-email"
              element={<VerifyEmail />}
            />
            <Route
              path="/reset-password"
              element={<ResetPassword />}
            />
            <Route
              path="/onboarding/organisation"
              element={
                <AuthGuard requirePortalAccess={false}>
                  <EmployerOrganizationGuard mode="onboarding">
                    <Suspense fallback={<PageLoader />}>
                      <OnboardingOrganisationPage />
                    </Suspense>
                  </EmployerOrganizationGuard>
                </AuthGuard>
              }
            />
            <Route
              element={
                <AuthGuard>
                  <EmployerOrganizationGuard mode="protected">
                    <AppLayout />
                  </EmployerOrganizationGuard>
                </AuthGuard>
              }
            >
              <Route path="/dashboard" element={<Suspense fallback={<PageLoader />}><DashboardPage /></Suspense>} />
              <Route path="/profile" element={<Suspense fallback={<PageLoader />}><ProfilePage /></Suspense>} />
              <Route path="/users" element={<Suspense fallback={<PageLoader />}><UsersPage /></Suspense>} />
              <Route path="/employers" element={<Suspense fallback={<PageLoader />}><EmployersPage /></Suspense>} />
              <Route path="/employers/:id" element={<Suspense fallback={<PageLoader />}><EmployerDetailsPage /></Suspense>} />
              <Route path="/organisation" element={<Suspense fallback={<PageLoader />}><OrganisationPage /></Suspense>} />
              <Route path="/organisation/team" element={<Suspense fallback={<PageLoader />}><OrganisationPage /></Suspense>} />
              <Route path="/jobs" element={<Suspense fallback={<PageLoader />}><JobsPage /></Suspense>} />
              <Route path="/jobs/:id" element={<Suspense fallback={<PageLoader />}><JobViewPage /></Suspense>} />
              <Route path="/jobs/:id/edit" element={<Suspense fallback={<PageLoader />}><JobFormPage /></Suspense>} />
              <Route path="/jobs/:id/applications" element={<Suspense fallback={<PageLoader />}><JobApplicationsPage /></Suspense>} />
              <Route path="/employers/:employerId/jobs/:id/applications" element={<Suspense fallback={<PageLoader />}><JobApplicationsPage /></Suspense>} />
              <Route path="/jobs/:jobId/external-clicks" element={<Suspense fallback={<PageLoader />}><JobExternalClicksPage /></Suspense>} />
              <Route path="/employers/:employerId/jobs/:jobId/external-clicks" element={<Suspense fallback={<PageLoader />}><JobExternalClicksPage /></Suspense>} />
              <Route path="/employers/:employerId/jobs/:id" element={<Suspense fallback={<PageLoader />}><JobViewPage /></Suspense>} />
              <Route path="/employers/:employerId/jobs/:id/edit" element={<Suspense fallback={<PageLoader />}><JobFormPage /></Suspense>} />
              <Route path="/events" element={<Suspense fallback={<PageLoader />}><EventsPage /></Suspense>} />
              <Route path="/events/new" element={<Suspense fallback={<PageLoader />}><EventForm /></Suspense>} />
              <Route path="/events/:id" element={<Suspense fallback={<PageLoader />}><EventForm /></Suspense>} />
              <Route path="/events/:id/edit" element={<Suspense fallback={<PageLoader />}><EventForm /></Suspense>} />
              <Route path="/events/:eventId/registrations" element={<Suspense fallback={<PageLoader />}><EventRegistrationsPage /></Suspense>} />
              <Route path="/events/:eventId/external-clicks" element={<Suspense fallback={<PageLoader />}><EventExternalClicksPage /></Suspense>} />
              <Route path="/employers/:employerId/events/new" element={<Suspense fallback={<PageLoader />}><EventForm /></Suspense>} />
              <Route path="/employers/:employerId/events/:id" element={<Suspense fallback={<PageLoader />}><EventForm /></Suspense>} />
              <Route path="/employers/:employerId/events/:id/edit" element={<Suspense fallback={<PageLoader />}><EventForm /></Suspense>} />
              <Route path="/employers/:employerId/events/:eventId/registrations" element={<Suspense fallback={<PageLoader />}><EventRegistrationsPage /></Suspense>} />
              <Route path="/employers/:employerId/events/:eventId/external-clicks" element={<Suspense fallback={<PageLoader />}><EventExternalClicksPage /></Suspense>} />
              <Route path="/ads" element={<Suspense fallback={<PageLoader />}><CampaignsPage /></Suspense>} />
              <Route path="/ads/new" element={<Suspense fallback={<PageLoader />}><CreateAdvertisementPage /></Suspense>} />
              <Route path="/ads/:id" element={<Suspense fallback={<PageLoader />}><CreateAdvertisementPage /></Suspense>} />
              <Route path="/ads/:id/edit" element={<Suspense fallback={<PageLoader />}><CreateAdvertisementPage /></Suspense>} />
              <Route path="/ads/:id/clicks" element={<Suspense fallback={<PageLoader />}><AdvertisementClicksPage /></Suspense>} />
              <Route path="/master-data" element={<Suspense fallback={<PageLoader />}><MasterDataPage /></Suspense>} />
              <Route path="/reports/others-specializations" element={<Suspense fallback={<PageLoader />}><OthersSpecializationsReportPage /></Suspense>} />
              <Route path="/analytics" element={<Suspense fallback={<PageLoader />}><AnalyticsPage /></Suspense>} />
              <Route path="/notifications" element={<Suspense fallback={<PageLoader />}><NotificationsPage /></Suspense>} />
              <Route path="/content" element={<Suspense fallback={<PageLoader />}><ContentPage /></Suspense>} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
