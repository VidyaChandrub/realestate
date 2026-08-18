import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Loader2 } from 'lucide-react';
import apiClient from '@/api/client';
import { normalizeRoles } from '@/auth/roles';

function mapBackendRole(role: string): string {
  switch (role?.toUpperCase()) {
    case 'ADMIN': return 'admin';
    case 'EMPLOYER': return 'employer';
    default: return role?.toLowerCase() ?? '';
  }
}

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setTokens, setUser, isAuthenticated } = useAuthStore();

  // Snapshot the query string so the effect can be strict-mode safe
  const paramsString = searchParams.toString();

  useEffect(() => {
    const params = new URLSearchParams(paramsString);
    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');
    const error = params.get('error');

    if (accessToken && refreshToken) {
      setTokens(accessToken, refreshToken, null);

      apiClient
        .get('/api/v1/users/me')
        .then(({ data }) => {
          const user = data?.data ?? data;
          const rawRole: string = user.preferences?.role ?? params.get('role') ?? '';
          setUser({
            id: user.userId || user.id || '',
            email: user.email || '',
            name: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'User',
            roles: normalizeRoles(rawRole ? [mapBackendRole(rawRole)] : []),
            organization: user.organization ?? null,
          });
          navigate('/dashboard', { replace: true });
        })
        .catch(() => {
          navigate('/', { replace: true });
        });

      return; // stop further navigation handling
    }

    if (error) {
      // use a fresh URLSearchParams instance to avoid mutating the hook-provided object
      const next = new URLSearchParams(paramsString);
      navigate(`/auth?${next.toString()}`, { replace: true });
      return;
    }

    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
      return;
    }

    navigate('/', { replace: true });
  }, [paramsString, navigate, setTokens, setUser, isAuthenticated]);

  return (
    <div className="min-h-screen bg-[#E8EAF0] flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-[#1a2b4b]" />
    </div>
  );
}
