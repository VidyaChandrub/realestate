import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  App,
  Credential,
  cert,
  getApps,
  initializeApp,
} from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import {
  PushMulticastResult,
  PushNotificationPayload,
  PushSendResult,
} from './firebase.types';

const INVALID_TOKEN_ERROR_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
]);

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private app?: App;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    this.initialize();
  }

  private initialize(): void {
    const existingApps = getApps();
    if (existingApps.length > 0) {
      this.app = existingApps[0];
      return;
    }

    const credential = this.resolveCredential();
    if (!credential) {
      this.logger.warn(
        'Firebase Admin SDK not initialized: no credentials configured. Push notifications will be disabled.',
      );
      return;
    }

    try {
      this.app = initializeApp({ credential });
      this.logger.log('Firebase Admin SDK initialized');
    } catch (error) {
      this.logger.error(
        `Failed to initialize Firebase Admin SDK: ${(error as Error).message}`,
      );
    }
  }

  private resolveCredential(): Credential | undefined {
    const projectId = this.config.get<string>('FIREBASE_PROJECT_ID');
    const clientEmail = this.config.get<string>('FIREBASE_CLIENT_EMAIL');
    const privateKey = this.config.get<string>('FIREBASE_PRIVATE_KEY');

    if (projectId && clientEmail && privateKey) {
      try {
        return cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        });
      } catch (error) {
        this.logger.warn(
          `Firebase Admin SDK not initialized: invalid FIREBASE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY (${(error as Error).message}). Push notifications will be disabled.`,
        );
        return undefined;
      }
    }

    const serviceAccountPath =
      this.config.get<string>('GOOGLE_APPLICATION_CREDENTIALS') ??
      this.config.get<string>('FIREBASE_SERVICE_ACCOUNT_PATH');

    if (serviceAccountPath) {
      try {
        return cert(serviceAccountPath);
      } catch (error) {
        this.logger.warn(
          `Firebase Admin SDK not initialized: could not load service account from "${serviceAccountPath}" (${(error as Error).message}). Push notifications will be disabled.`,
        );
        return undefined;
      }
    }

    return undefined;
  }

  private isReady(): boolean {
    return this.app !== undefined;
  }

  async sendToDevice(
    token: string,
    payload: PushNotificationPayload,
  ): Promise<PushSendResult> {
    if (!this.isReady()) {
      return { success: false, invalidToken: false };
    }

    try {
      await getMessaging(this.app).send({
        token,
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.image,
        },
        data: payload.data,
      });

      this.logger.log(`Push sent to device ${this.maskToken(token)}`);
      return { success: true, invalidToken: false };
    } catch (error) {
      const invalidToken = this.isInvalidTokenError(error);
      this.logger.error(
        `Push failed for device ${this.maskToken(token)}: ${(error as { message?: string }).message}`,
      );
      return { success: false, invalidToken };
    }
  }

  async sendToDevices(
    tokens: string[],
    payload: PushNotificationPayload,
  ): Promise<PushMulticastResult> {
    if (!this.isReady() || tokens.length === 0) {
      return {
        successCount: 0,
        failureCount: tokens.length,
        invalidTokens: [],
      };
    }

    try {
      const response = await getMessaging(this.app).sendEachForMulticast({
        tokens,
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.image,
        },
        data: payload.data,
      });

      const invalidTokens: string[] = [];
      response.responses.forEach((result, index) => {
        if (result.success) {
          return;
        }

        this.logger.warn(
          `Push failed for device ${this.maskToken(tokens[index])}: ${result.error?.code ?? 'unknown error'}`,
        );

        if (this.isInvalidTokenError(result.error)) {
          invalidTokens.push(tokens[index]);
        }
      });

      this.logger.log(
        `Push multicast sent: ${response.successCount} succeeded, ${response.failureCount} failed`,
      );

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
        invalidTokens,
      };
    } catch (error) {
      this.logger.error(
        `Push multicast send failed: ${(error as Error).message}`,
      );
      return {
        successCount: 0,
        failureCount: tokens.length,
        invalidTokens: [],
      };
    }
  }

  private isInvalidTokenError(error: unknown): boolean {
    const code = (error as { code?: string } | undefined)?.code;
    return code !== undefined && INVALID_TOKEN_ERROR_CODES.has(code);
  }

  private maskToken(token: string): string {
    return token.length <= 8
      ? '****'
      : `${token.slice(0, 4)}...${token.slice(-4)}`;
  }
}
