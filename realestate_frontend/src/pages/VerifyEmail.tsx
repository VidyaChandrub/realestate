import { useState } from 'react';
import { Link, useSearchParams, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Loader2, MailCheck, MailWarning, Home } from 'lucide-react';
import { resendVerificationEmail } from '@/lib/auth';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const inputCls =
  'h-14 rounded-2xl bg-[#E3E4F5] border border-[#CDD0E8] focus-visible:ring-2 focus-visible:ring-[#1D35C0]/40 focus-visible:border-[#1D35C0] placeholder:text-gray-400';

function getErrorMessage(err: any): string {
  const msg = err?.response?.data?.message ?? err?.message;
  return Array.isArray(msg) ? msg[0] : (msg ?? 'Something went wrong. Please try again.');
}

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuthStore();
  const status = searchParams.get('verification');
  const email = searchParams.get('email') ?? '';
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isSuccess = status === 'success';
  const title = isSuccess
    ? 'Email verified successfully'
    : status === 'expired'
      ? 'Verification link expired'
      : 'Invalid verification link';
  const description = isSuccess
    ? 'Your email is verified. You can now log in and continue to onboarding.'
    : 'Enter your email address and we will send you a fresh verification link.';

  const handleResend = async () => {
    if (!email.trim()) {
      setError('Enter your email address so we can resend the verification email.');
      return;
    }

    setError(null);
    setMessage(null);
    setSubmitting(true);
    try {
      const result = await resendVerificationEmail(email.trim());
      setMessage(result.message ?? 'Verification email sent successfully. Please check your inbox.');
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-[#E8EAF0] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-7">
        <div className="flex items-center gap-2">
          <Home className="w-8 h-8 text-[#1a2b4b]" />
          <span className="font-bold text-xl text-[#1a2b4b]">RealEstate</span>
        </div>

        <div className="space-y-4 rounded-2xl bg-white/60 p-6 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1D35C0]/10 text-[#1D35C0]">
            {isSuccess ? <MailCheck className="h-6 w-6" /> : <MailWarning className="h-6 w-6" />}
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold text-gray-900 leading-tight">{title}</h1>
            <p className="text-sm text-gray-600">{description}</p>
          </div>

          {!isSuccess && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  readOnly
                  disabled
                  autoComplete="email"
                  className={`${inputCls} opacity-70 cursor-not-allowed`}
                />
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}
              {message && <p className="text-sm text-green-600">{message}</p>}

              <button
                type="button"
                onClick={handleResend}
                disabled={submitting}
                className="w-full h-14 rounded-full bg-[#1D35C0] hover:bg-[#1628A8] text-white font-bold text-base transition-colors disabled:opacity-60 flex items-center justify-center"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Resend Verification Email'}
              </button>
            </div>
          )}

          <Link
            to="/auth"
            className="flex h-14 w-full items-center justify-center rounded-full border border-[#1D35C0] text-[#1D35C0] font-bold hover:bg-[#1D35C0]/5"
          >
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}
