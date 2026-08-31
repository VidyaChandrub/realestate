import type { OnboardingStep } from '@prisma/client';

// Canonical wizard order — matches the actual UI step order (Modules sits
// between Templates and Invite, per spec), not the mandatory/skippable
// grouping. A value here means "this step has been completed"; resume
// logic shows whatever comes after it.
//
// Note this is the single source of truth for progression — the Postgres
// enum's own declared value order (schema.prisma) does NOT need to match
// this and isn't relied on anywhere (no ORDER BY on the raw enum column);
// reordering it would mean an ALTER TYPE migration for zero functional
// benefit, so it's deliberately left as originally declared.
export const ONBOARDING_STEP_ORDER: OnboardingStep[] = [
  'account',
  'organisation',
  'business_details',
  'subscription',
  'templates',
  'modules',
  'invite',
  'connect',
  'completed',
];

const STEP_INDEX: Record<OnboardingStep, number> = ONBOARDING_STEP_ORDER.reduce(
  (acc, step, i) => ({ ...acc, [step]: i }),
  {} as Record<OnboardingStep, number>,
);

export function onboardingStepIndex(step: OnboardingStep): number {
  return STEP_INDEX[step];
}

// The step a resuming user should land on next, given the furthest step
// they've actually completed. 'completed' has no "next" — callers should
// treat that as "go to the dashboard", not re-enter the wizard.
export function nextOnboardingStep(completed: OnboardingStep): OnboardingStep {
  const i = onboardingStepIndex(completed);
  return ONBOARDING_STEP_ORDER[Math.min(i + 1, ONBOARDING_STEP_ORDER.length - 1)];
}

// Re-submitting an earlier step (e.g. editing Business Details after
// already finishing Templates) must never roll onboarding progress
// backwards — only ever advance to the further of the two.
export function furthestOnboardingStep(
  current: OnboardingStep,
  justCompleted: OnboardingStep,
): OnboardingStep {
  return onboardingStepIndex(justCompleted) > onboardingStepIndex(current)
    ? justCompleted
    : current;
}

// Templates is the last mandatory step in wizard order (Account,
// Organisation, Business Details, Subscription, Templates) — Modules,
// Invite and Connect are all skippable, so "mandatory steps done" is
// exactly "reached at least Templates".
export function hasMandatoryStepsDone(step: OnboardingStep): boolean {
  return onboardingStepIndex(step) >= onboardingStepIndex('templates');
}
