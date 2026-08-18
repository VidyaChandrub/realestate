export interface PushNotificationPayload {
  title: string;
  body: string;
  image?: string;
  data: Record<string, string>;
}

export interface PushSendResult {
  success: boolean;
  invalidToken: boolean;
}

export interface PushMulticastResult {
  successCount: number;
  failureCount: number;
  invalidTokens: string[];
}
