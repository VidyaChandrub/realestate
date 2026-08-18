import { useEffect, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { employersApi, usersApi } from '@/api/services';
import { Loader2 } from 'lucide-react';
import type { AuthUser } from '@/types';
import { canAccessPortal, hasAdminRole, hasEmployerRole, normalizeRoles } from './roles';
import { hasSkippedOrganizationOnboarding } from '@/lib/organizationOnboarding';

function getDisplayName(user: Awaited<ReturnType<typeof usersApi.getMe>>) {
  const name = user.fullName || [user.firstName, user.lastName].filter(Boolean).join(' ');
  return name || user.email || 'User';
}

export function getSyncedAuthUser(
  currentUser: Awaited<ReturnType<typeof usersApi.getMe>> | undefined,
  fallbackUser: AuthUser | null
) {
  if (!currentUser) return null;

  const backendRoles = currentUser.preferences?.roles;
  const roles = Array.isArray(backendRoles)
    ? normalizeRoles(backendRoles)
    : normalizeRoles(fallbackUser?.roles ?? []);

  return {
    id: currentUser.userId || currentUser.id || fallbackUser?.id || '',
    email: currentUser.email || fallbackUser?.email || '',
    name: getDisplayName(currentUser),
    roles,
  };
}

function hasAuthUserChanged(nextUser: AuthUser | null, currentUser: AuthUser | null) {
  if (!nextUser) return false;

  return (
    nextUser.id !== currentUser?.id ||
    nextUser.email !== currentUser?.email ||
    nextUser.name !== currentUser?.name ||
    nextUser.roles.join('|') !== (currentUser?.roles ?? []).join('|')
  );
}

export function AuthGuard({
  children,
  requirePortalAccess = true,
}: {
  children: ReactNode;
  requirePortalAccess?: boolean;
}) {
  const { isAuthenticated, isLoading, isLoggingOut, user, token, setUser } = useAuthStore();

  const {
    data: currentUser,
    isLoading: isRefreshingUser,
  } = useQuery({
    queryKey: ['current-user', user?.id],
    queryFn: usersApi.getMe,
    enabled: isAuthenticated && !!token,
    staleTime: 30_000,
    retry: false,
  });

  const syncedUser = getSyncedAuthUser(currentUser, user);
  const needsUserSync = hasAuthUserChanged(syncedUser, user);

  useEffect(() => {
    if (syncedUser && needsUserSync) {
      setUser(syncedUser);
    }
  }, [needsUserSync, setUser, syncedUser]);

  if (isLoading || isLoggingOut || (requirePortalAccess && (isRefreshingUser || needsUserSync))) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            {isLoggingOut ? 'Signing out...' : 'Authenticating...'}
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (requirePortalAccess && !canAccessPortal(user?.roles)) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="rounded-full bg-destructive/10 p-4">
            <span className="text-2xl">🔒</span>
          </div>
          <h2 className="text-xl font-semibold text-foreground">Access Denied</h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            You must have ADMIN or EMPLOYER privileges to access this panel.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function GuardLoader({ message }: { message: string }) {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

export function EmployerOrganizationGuard({
  children,
  mode,
}: {
  children: ReactNode;
  mode: 'protected' | 'onboarding';
}) {
  const { user } = useAuthStore();
  const roles = user?.roles ?? [];
  console.log('User roles in EmployerOrganizationGuard:', roles);
  const isAdmin = hasAdminRole(roles);
  const isEmployer = hasEmployerRole(roles);

  const { data: organizations = [], isLoading } = useQuery({
    queryKey: ['my-organizations', user?.id],
    queryFn: () => employersApi.listMine(),
    enabled: !!user && !isAdmin && (isEmployer || mode === 'onboarding'),
    staleTime: 30_000,
  });

  if (!user || isAdmin) {
    if (mode === 'onboarding') return <Navigate to="/dashboard" replace />;
    return <>{children}</>;
  }

  if (!isEmployer && mode !== 'onboarding') {
    return <>{children}</>;
  }

  if (isLoading) {
    return <GuardLoader message="Checking your organization..." />;
  }

  const hasOrganizations = organizations.length > 0;
  const skippedOrganizationOnboarding = hasSkippedOrganizationOnboarding(user);

  if (mode === 'onboarding') {
    if (hasOrganizations || skippedOrganizationOnboarding) return <Navigate to="/dashboard" replace />;
    return <>{children}</>;
  }

  if (!hasOrganizations && !skippedOrganizationOnboarding) {
    return <Navigate to="/onboarding/organisation" replace />;
  }

  return <>{children}</>;
}
