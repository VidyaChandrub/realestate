import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useMutation, useQuery } from '@tanstack/react-query';
import { usersApi } from '@/api/services';
import type { UpdateUserProfileRequest, User } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { getIndianMobileNumberError, sanitizeIndianMobileNumber } from '@/lib/mobileNumber';

export default function ProfilePage() {
  const navigate = useNavigate();
  const authUser = useAuthStore((state) => state.user);
  const userId = authUser?.id;

  const {
    data: profile,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<User, unknown>({
    queryKey: ['user-profile', userId],
    queryFn: () => usersApi.getProfile(),
    enabled: !!userId,
    retry: false,
  });

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.firstName ?? '');
      setLastName(profile.lastName ?? '');
      setPhoneNumber(profile.phoneNumber ?? '');
      setIsDirty(false);
    }
  }, [profile]);

  const mobileError = useMemo(() => getIndianMobileNumberError(phoneNumber), [phoneNumber]);

  const updateProfileMutation = useMutation<User, unknown, UpdateUserProfileRequest>({
    mutationFn: (payload) => usersApi.updateProfile(payload),
    onSuccess: (data) => {
      toast.success('Profile updated successfully.');
      setFirstName(data.firstName ?? '');
      setLastName(data.lastName ?? '');
      setPhoneNumber(data.phoneNumber ?? '');
      setIsDirty(false);
      refetch();
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message || err?.message || 'Failed to update profile.';
      toast.error(message);
    },
  });

  const handleSave = async () => {
    if (!userId) {
      return;
    }

    if (mobileError) {
      toast.error(mobileError);
      return;
    }

    updateProfileMutation.mutate({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phoneNumber: sanitizeIndianMobileNumber(phoneNumber),
    });
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-6">
          <Skeleton className="h-8 w-40 rounded-md" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-14 w-full rounded-md" />
            <Skeleton className="h-14 w-full rounded-md" />
            <Skeleton className="h-14 w-full rounded-md" />
            <Skeleton className="h-14 w-full rounded-md" />
          </div>
          <Skeleton className="h-11 w-32 rounded-full" />
        </div>
      );
    }

    if (isError) {
      return (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-sm text-destructive-foreground">
          <p className="font-semibold">Unable to load profile.</p>
          <p>{error instanceof Error ? error.message : 'Try refreshing the page.'}</p>
          <Button variant="secondary" className="mt-4" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      );
    }

    if (!profile) {
      return (
        <div className="rounded-lg border border-border bg-background p-6 text-sm text-foreground">
          <p className="font-semibold">Profile not found.</p>
          <Button variant="secondary" className="mt-4" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(event) => {
                setFirstName(event.target.value);
                setIsDirty(true);
              }}
              placeholder="First Name"
            />
          </div>
          <div>
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(event) => {
                setLastName(event.target.value);
                setIsDirty(true);
              }}
              placeholder="Last Name"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={profile.email} disabled />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="phoneNumber">Mobile Number</Label>

            <div className="flex items-center gap-2 mt-2">
              <span className="inline-flex h-10 items-center rounded-md border border-[#CDD0E8] bg-[#f0f2f7] px-4 text-sm font-medium text-[#1D35C0]">
                +91
              </span>

              <Input
                id="phoneNumber"
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                value={phoneNumber}
                placeholder="Enter mobile number"
                maxLength={10}
                onChange={(event) => {
                  setPhoneNumber(
                    sanitizeIndianMobileNumber(event.target.value).slice(0, 10),
                  );
                  setIsDirty(true);
                }}
                className="flex-1"
              />
            </div>

            {mobileError && (
              <p className="mt-2 text-sm text-destructive">
                {mobileError}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">Make sure your profile details are up to date.</div>
          <Button
            onClick={handleSave}
            disabled={!isDirty || updateProfileMutation.isPending}
            className="min-w-[160px]"
          >
            {updateProfileMutation.isPending ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">My Profile</h1>
        </div>
        <Button variant="ghost" onClick={() => navigate('/dashboard')}>
          Back to dashboard
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile details</CardTitle>
          <CardDescription>Update your account information and contact details.</CardDescription>
        </CardHeader>
        <CardContent>{renderContent()}</CardContent>
      </Card>
    </div>
  );
}
