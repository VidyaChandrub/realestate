import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Eye, EyeOff, CheckCircle2, Compass } from 'lucide-react';
import apiClient from '@/api/client';

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
        placeholder={placeholder ?? '••••••••'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        autoComplete={autoComplete}
        className="pr-10 rounded-full bg-gray-100 border-0 focus-visible:ring-1 focus-visible:ring-[#1a2b4b]/30"
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        tabIndex={-1}
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div className="min-h-screen bg-[#E8EAF0] flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl shadow-sm px-8 py-8 max-w-sm w-full text-center space-y-4">
          <p className="text-red-500 font-medium">Invalid reset link.</p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-sm text-[#1a2b4b] font-semibold hover:underline"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.post('/api/v1/auth/reset-password', { token, newPassword: password });
      setDone(true);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message;
      setError(Array.isArray(msg) ? msg[0] : (msg ?? 'Something went wrong. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#E8EAF0] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="gradient-primary flex h-9 w-9 items-center justify-center rounded-lg">
            <Compass className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-xl text-[#1a2b4b]">RealEstate</span>
        </div>

        <div className="bg-white rounded-3xl shadow-sm px-8 py-8 space-y-5">
          {done ? (
            <div className="text-center space-y-4">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
              <h2 className="text-xl font-bold text-[#1a2b4b]">Password reset!</h2>
              <p className="text-sm text-gray-500">Your password has been updated successfully.</p>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="w-full h-11 rounded-full bg-[#1a2b4b] hover:bg-[#1a2b4b]/90 text-white font-semibold text-sm transition-colors"
              >
                Log In
              </button>
            </div>
          ) : (
            <>
              <div className="text-center space-y-1">
                <h1 className="text-2xl font-bold text-[#1a2b4b]">Set new password</h1>
                <p className="text-sm text-gray-500">Choose a strong password for your account.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="password" className="text-xs font-medium text-gray-600">New Password</Label>
                  <PasswordInput
                    id="password"
                    value={password}
                    onChange={setPassword}
                    placeholder="Min. 8 characters"
                    autoComplete="new-password"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="confirmPassword" className="text-xs font-medium text-gray-600">Confirm New Password</Label>
                  <PasswordInput
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    placeholder="Repeat your password"
                    autoComplete="new-password"
                  />
                </div>

                {error && <p className="text-xs text-red-500 text-center">{error}</p>}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-11 rounded-full bg-[#1a2b4b] hover:bg-[#1a2b4b]/90 text-white font-semibold text-sm transition-colors disabled:opacity-60 flex items-center justify-center"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Reset Password'}
                </button>
              </form>

              <p className="text-center text-xs text-gray-500">
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="text-[#1a2b4b] font-semibold hover:underline"
                >
                  Back to Login
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
