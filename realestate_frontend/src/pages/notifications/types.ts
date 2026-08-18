export interface BroadcastTargetingRules {
  countryIds: string[];
  stateIds: string[];
  cityIds: string[];
  skillIds: string[];
  experienceLevelIds: string[];
  educationLevelIds: string[];
  specializationIds: string[];
  yearOfPassing: string[];
}

export interface CreateBroadcastPayload {
  title: string;
  message: string;
  actionUrl?: string;
  targetingRules: BroadcastTargetingRules;
}

export type BroadcastStatus = 'PENDING' | 'SENDING' | 'COMPLETED' | 'FAILED' | 'NO_RECIPIENTS';

export interface BroadcastTargetingSummaryItem {
  id: string;
  name: string;
}

export interface Broadcast {
  id: string;
  title: string;
  message: string;
  status: BroadcastStatus;
  recipientCount: number;
  successCount: number;
  failureCount: number;
  targetingSummary?: Record<string, BroadcastTargetingSummaryItem[]> | null;
  targetingRules?: BroadcastTargetingRules | null;
  actionUrl?: string | null;
  createdAt: string;
  sentAt?: string | null;
}
