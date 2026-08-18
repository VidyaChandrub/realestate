import { useEffect, useState } from 'react';
import { useNavigate, Navigate, useSearchParams } from 'react-router-dom';
import { Compass, Briefcase, Users, BarChart3, ArrowRight, CheckCircle2, Loader2, Eye, EyeOff, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useAuthStore } from '@/store/authStore';
import { login, register, forgotPassword, resendVerificationEmail } from '@/lib/auth';
import {
  sanitizeIndianMobileNumber,
  getIndianMobileNumberError,
} from '@/lib/mobileNumber';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'https://mobile.realestate.in';
import { canAccessPortal } from '@/auth/roles';
import { employersApi } from '@/api/services';
import { hasSkippedOrganizationOnboarding } from '@/lib/organizationOnboarding';
import { hasAdminRole } from '@/auth/roles';

const features = [
  {
    icon: Briefcase,
    title: 'Post Jobs',
    description: 'Create and publish job listings to reach thousands of qualified candidates.',
  },
  {
    icon: Users,
    title: 'Manage Applications',
    description: 'Track, review, and manage applications with a streamlined pipeline.',
  },
  {
    icon: BarChart3,
    title: 'Team Collaboration',
    description: 'Invite your team, assign roles, and collaborate on hiring decisions.',
  },
];

type Mode = 'login' | 'register' | 'forgot' | 'verify-email-pending';

function getOAuthErrorMessage(code?: string): string | null {
  switch (code) {
    case 'EMPLOYER_ACCOUNT_EXISTS':
      return 'This email is already registered as an Agency. Please login from the agency portal.';
    case 'JOBSEEKER_ACCOUNT_EXISTS':
      return 'This email is already registered as a Job Seeker. Please login from the job seeker portal.';
    case 'ACCOUNT_DEACTIVATED':
      return 'Your account has been deactivated by admin.';
    case 'SOCIAL_LOGIN_FAILED':
      return 'Social login failed. Please try again.';
    case 'EMAIL_VERIFICATION_PENDING':
      return 'Email verification is pending. Please verify your email before continuing.';
    default:
      return null;
  }
}

function getErrorMessage(err: any): string {
  const msg = err?.response?.data?.message ?? err?.message;
  return Array.isArray(msg) ? msg[0] : (msg ?? 'Something went wrong. Please try again.');
}

function isVerificationPendingMessage(message: string): boolean {
  return message.toLowerCase().includes('verification') && message.toLowerCase().includes('pending');
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}


function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#0A66C2" xmlns="http://www.w3.org/2000/svg">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

const inputCls =
  'h-11 rounded-2xl bg-[#E3E4F5] border border-[#CDD0E8] focus-visible:ring-2 focus-visible:ring-[#1D35C0]/40 focus-visible:border-[#1D35C0] placeholder:text-gray-400';

function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? 'text' : 'password'}
        placeholder={placeholder ?? 'Enter your password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        autoComplete={autoComplete}
        className={`${inputCls} pr-12`}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        tabIndex={-1}
      >
        {show ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
      </button>
    </div>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const errorCode = searchParams.get('error');
  const { isAuthenticated, isLoading } = useAuthStore();

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [mobileTouched, setMobileTouched] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Helpers to consistently clear transient state and messages in the auth modal
  const clearMessages = () => {
    setError(null);
    setSuccessMsg(null);
  };

  const resetTransientState = () => {
    setPassword('');
    setConfirmPassword('');
    setAcceptedTerms(false);
    setFirstName('');
    setLastName('');
    setMobileNumber('');
    setMobileTouched(false);
    setSubmitting(false);
    clearMessages();
  };

  useEffect(() => {
    const message = getOAuthErrorMessage(errorCode ?? undefined);

    if (!message) return;

    setMode('login');
    setError(message);
    setOpen(true);

    if (errorCode === 'EMAIL_VERIFICATION_PENDING') {
      setPendingVerificationEmail(searchParams.get('email') ?? '');
    }

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('error');
    nextParams.delete('email');

    const nextSearch = nextParams.toString();
    const nextUrl = window.location.pathname + (nextSearch ? `?${nextSearch}` : '');

    navigate(nextUrl, { replace: true });
  }, [errorCode, navigate, searchParams]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Checking your session...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const openDialog = (m: Mode) => {
    // reset transient inputs before changing mode to avoid transient render/state issues
    resetTransientState();
    setMode(m);
    if (m !== 'verify-email-pending') {
      setPendingVerificationEmail('');
      setResendingVerification(false);
    }
    setOpen(true);
  };

  const switchMode = (next: Mode) => {
    // reset transient inputs before changing mode to avoid transient render/state issues
    resetTransientState();
    setMode(next);
    if (next !== 'verify-email-pending') {
      setPendingVerificationEmail('');
      setResendingVerification(false);
    }
  };

  const handleResendVerification = async () => {
    const targetEmail = (pendingVerificationEmail || email).trim();
    if (!targetEmail) {
      setError('Enter your email address so we can resend the verification email.');
      return;
    }

    clearMessages();
    setResendingVerification(true);
    try {
      const result = await resendVerificationEmail(targetEmail);
      setPendingVerificationEmail(targetEmail);
      setSuccessMsg(result.message ?? 'Verification email sent successfully. Please check your inbox before logging in.');
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setResendingVerification(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (mode === 'login') {
      setPendingVerificationEmail('');
    }

    if (mode === 'register') {
      setMobileTouched(true);
      const mobileError = getIndianMobileNumberError(mobileNumber);
      if (mobileError) {
        setError(mobileError);
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      if (!acceptedTerms) {
        setError('Please accept the Terms of Service to continue');
        return;
      }
    }

    setSubmitting(true);

    try {
      if (mode === 'forgot') {
        const result = await forgotPassword(email);
        setSuccessMsg(result.message);
        return;
      }

      let authUser;
      if (mode === 'login') {
        authUser = await login(email, password);
      } else {
        const result = await register(
          email,
          password,
          firstName || undefined,
          lastName || undefined,
          sanitizeIndianMobileNumber(mobileNumber) || undefined,
        );

        if ('emailVerificationRequired' in result && result.emailVerificationRequired) {
          // Clear transient form state before showing verification pending
          resetTransientState();
          setPendingVerificationEmail(email);
          setSuccessMsg(result.message ?? 'Verification email sent successfully. Please check your inbox before logging in.');
          setMode('verify-email-pending');
          setOpen(true);
          return;
        }

        authUser = result;
      }

      if (!canAccessPortal(authUser.roles)) {
        setError('Your account does not have access to this portal. You need admin or agency privileges.');
        useAuthStore.getState().logout();
        return;
      }

      setOpen(false);

      if (!hasAdminRole(authUser.roles)) {
        try {
          const organizations = await employersApi.listMine();
          if (organizations.length === 0 && !hasSkippedOrganizationOnboarding(authUser)) {
            navigate('/onboarding/organisation', { replace: true });
            return;
          }
        } catch {
          if (!hasSkippedOrganizationOnboarding(authUser)) {
            navigate('/onboarding/organisation', { replace: true });
            return;
          }
        }
      }

      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      const msg = getErrorMessage(err);

      if (msg.toLowerCase().includes('mobile number')) {
        setError(msg);
        return;
      }

      if (mode === 'login' && isVerificationPendingMessage(msg)) {
        // Preserve backend message while detecting verification pending state
        setPendingVerificationEmail(email);
        setError(msg);
        return;
      }

      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <Home className="w-8 h-8 text-primary" />
            <span className="text-lg font-bold">RealEstate</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => openDialog('login')}>Login</Button>
            <Button onClick={() => openDialog('register')}>Register as Agency</Button>
          </div>
        </div>
      </nav>

      <section className="px-6 py-24">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Trusted by 500+ companies
          </div>
          <h1 className="mb-6 text-5xl font-extrabold leading-tight tracking-tight md:text-6xl">
            Find the best talent
            <br />
            <span className="text-gradient">for your organisation</span>
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground">
            RealEstate helps agencies post properties, manage inquiries, and build great teams — all in one modern platform.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button size="lg" onClick={() => openDialog('register')} className="gap-2 px-8">
              Get Started <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => openDialog('login')}>
              Login
            </Button>
          </div>
        </div>
      </section>

      <section className="bg-muted/50 px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-12 text-center text-3xl font-bold">
            Everything you need to hire great people
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t px-6 py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Compass className="h-4 w-4" />
            <span>© 2026 RealEstate. All rights reserved.</span>
          </div>
        </div>
      </footer>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden rounded-3xl border-0 bg-[#E8EAF0] max-h-[90vh] flex flex-col">
          <div className="overflow-y-auto flex-1 px-8 py-6 space-y-5">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <Home className="w-8 h-8 text-[#1a2b4b]" />
              <span className="font-bold text-xl text-[#1a2b4b]">RealEstate</span>
            </div>

            {/* Heading */}
            <div className="space-y-2">
              <h2 className="text-3xl font-extrabold text-gray-900 leading-tight">
                {mode === 'login' ? (<>Sign in to your<br />Account</>) :
                 mode === 'register' ? (<>Create your<br />Account</>) :
                 mode === 'verify-email-pending' ? (<>Verify your<br />Email</>) :
                 (<>Reset your<br />Password</>)}
              </h2>
            </div>

            {mode === 'verify-email-pending' ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                  {successMsg ?? 'Verification email sent successfully. Please check your inbox before logging in.'}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="d-pending-email" className="text-sm font-medium text-gray-700">
                    Email
                  </Label>
                  <Input
                    id="d-pending-email"
                    type="email"
                    value={pendingVerificationEmail}
                    readOnly
                    disabled
                    autoComplete="email"
                    className={`${inputCls} opacity-70 cursor-not-allowed`}
                  />
                </div>

                {error && <p className="text-sm text-red-500">{error}</p>}

                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resendingVerification}
                  className="w-full h-12 rounded-full bg-[#1D35C0] hover:bg-[#1628A8] text-white font-bold text-base transition-colors disabled:opacity-60 flex items-center justify-center"
                >
                  {resendingVerification ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Resend Verification Email'}
                </button>

                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="w-full h-12 rounded-full border border-gray-300 text-gray-700 font-bold hover:bg-white/60"
                >
                  Login
                </button>
              </div>
            ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Register: First + Last name */}
              {mode === 'register' && (
                <div className="flex gap-3">
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="d-firstName" className="text-sm font-medium text-gray-700">First Name</Label>
                    <Input
                      id="d-firstName"
                      placeholder="First name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      autoComplete="given-name"
                      className={inputCls}
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="d-lastName" className="text-sm font-medium text-gray-700">Last Name</Label>
                    <Input
                      id="d-lastName"
                      placeholder="Last name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      autoComplete="family-name"
                      className={inputCls}
                    />
                  </div>
                </div>
              )}

              {/* Email / identifier */}
              <div className="space-y-1">
                <Label htmlFor="d-email" className="text-sm font-medium text-gray-700">
                  Email
                </Label>
                <Input
                  id="d-email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className={inputCls}
                />
              </div>

              {/* Register: Mobile */}
              {mode === 'register' && (
                <div className="space-y-1">
                  <Label htmlFor="d-mobile" className="text-sm font-medium text-gray-700">Mobile Number</Label>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-11 items-center rounded-2xl border border-[#CDD0E8] bg-[#E3E4F5] px-4 text-sm font-medium text-[#1D35C0]">
                      +91
                    </span>
                    <Input
                      id="d-mobile"
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="Enter mobile number"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(sanitizeIndianMobileNumber(e.target.value))}
                      onBlur={() => setMobileTouched(true)}
                      autoComplete="tel"
                      className={`${inputCls} flex-1`}
                      maxLength={10}
                    />
                  </div>
                  {mobileTouched && getIndianMobileNumberError(mobileNumber) && (
                    <p className="text-sm text-red-500">{getIndianMobileNumberError(mobileNumber)}</p>
                  )}
                </div>
              )}

              {/* Password */}
              {mode !== 'forgot' && (
                <div className="space-y-1">
                  <Label htmlFor="d-password" className="text-sm font-medium text-gray-700">Password</Label>
                  <PasswordInput
                    id="d-password"
                    value={password}
                    onChange={setPassword}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  />
                  {mode === 'login' && (
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => switchMode('forgot')}
                        className="text-sm text-[#1D35C0] font-medium hover:underline"
                      >
                        Forgot Password ?
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Confirm Password */}
              {mode === 'register' && (
                <div className="space-y-1">
                  <Label htmlFor="d-confirmPassword" className="text-sm font-medium text-gray-700">Confirm Password</Label>
                  <PasswordInput
                    id="d-confirmPassword"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    placeholder="Confirm your password"
                    autoComplete="new-password"
                  />
                </div>
              )}

              {/* Terms */}
              {mode === 'register' && (
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="d-terms"
                    checked={acceptedTerms}
                    onCheckedChange={(v) => setAcceptedTerms(!!v)}
                    className="mt-0.5"
                  />
                  <label htmlFor="d-terms" className="text-xs text-gray-500 leading-relaxed cursor-pointer">
                    I agree to the{' '}
                    <span className="text-[#1D35C0] font-medium hover:underline cursor-pointer">Terms of Service</span>
                    {' '}and{' '}
                    <span className="text-[#1D35C0] font-medium hover:underline cursor-pointer">Privacy Policy</span>
                  </label>
                </div>
              )}

              {error && <p className="text-sm text-red-500">{error}</p>}
              {successMsg && <p className="text-sm text-green-600">{successMsg}</p>}
              {mode === 'login' && error && pendingVerificationEmail && (
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resendingVerification}
                  className="text-sm text-[#1D35C0] font-bold hover:underline disabled:opacity-60"
                >
                  {resendingVerification ? 'Sending...' : 'Resend verification email'}
                </button>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full h-12 rounded-full bg-[#1D35C0] hover:bg-[#1628A8] text-white font-bold text-base transition-colors disabled:opacity-60 flex items-center justify-center"
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : mode === 'login' ? (
                  'Log In'
                ) : mode === 'register' ? (
                  'Create Account'
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </form>
            )}

            {/* Social */}
            {mode !== 'forgot' && mode !== 'verify-email-pending' && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-gray-300" />
                  <span className="text-sm text-gray-400">Or</span>
                  <div className="flex-1 h-px bg-gray-300" />
                </div>
                <div className="flex gap-3">
                  {(['google', 'linkedin'] as const).map((provider) => {
                    const Icon = provider === 'google' ? GoogleIcon : LinkedInIcon;
                    return (
                      <button
                        key={provider}
                        type="button"
                        onClick={() => { window.location.href = `${API_BASE}/api/v1/auth/${provider}?dest=admin&role=EMPLOYER`; }}
                        className="flex-1 h-12 rounded-2xl bg-white border border-gray-200 flex items-center justify-center shadow-sm hover:shadow-md transition-shadow"
                        title={`Continue with ${provider.charAt(0).toUpperCase() + provider.slice(1)}`}
                      >
                        <Icon />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Mode switcher */}
            <p className="text-center text-sm text-gray-500">
              {mode === 'login' ? (
                <>
                  Don&apos;t have an account?{' '}
                  <button type="button" onClick={() => switchMode('register')} className="text-[#1D35C0] font-bold hover:underline">
                    Register
                  </button>
                </>
              ) : mode === 'register' ? (
                <>
                  Already have an account?{' '}
                  <button type="button" onClick={() => switchMode('login')} className="text-[#1D35C0] font-bold hover:underline">
                    Log In
                  </button>
                </>
              ) : mode === 'verify-email-pending' ? (
                <>
                  Already verified?{' '}
                  <button type="button" onClick={() => switchMode('login')} className="text-[#1D35C0] font-bold hover:underline">
                    Log In
                  </button>
                </>
              ) : (
                <>
                  Remember your password?{' '}
                  <button type="button" onClick={() => switchMode('login')} className="text-[#1D35C0] font-bold hover:underline">
                    Back to Log In
                  </button>
                </>
              )}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
