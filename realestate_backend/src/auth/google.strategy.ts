import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService) {
    const clientID = config.get<string>('GOOGLE_CLIENT_ID') ?? '';
    if (!clientID) Logger.warn('GOOGLE_CLIENT_ID not set – Google OAuth disabled', 'GoogleStrategy');
    super({
      clientID: clientID || 'disabled',
      clientSecret: config.get<string>('GOOGLE_CLIENT_SECRET') ?? 'disabled',
      callbackURL: config.get<string>('GOOGLE_CALLBACK_URL') ?? 'http://localhost/disabled',
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ) {
    const user = {
      email: profile.emails?.[0]?.value ?? '',
      firstName: profile.name?.givenName ?? '',
      lastName: profile.name?.familyName ?? '',
      googleId: profile.id,
    };
    done(null, user);
  }
}
