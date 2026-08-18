import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-facebook';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(config: ConfigService) {
    const clientID = config.get<string>('FACEBOOK_CLIENT_ID') ?? '';
    if (!clientID) Logger.warn('FACEBOOK_CLIENT_ID not set – Facebook OAuth disabled', 'FacebookStrategy');
    super({
      clientID: clientID || 'disabled',
      clientSecret: config.get<string>('FACEBOOK_CLIENT_SECRET') ?? 'disabled',
      callbackURL: config.get<string>('FACEBOOK_CALLBACK_URL') ?? 'http://localhost/disabled',
      profileFields: ['id', 'emails', 'name'],
      scope: ['email'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: any,
    done: (err: any, user?: any) => void,
  ) {
    const user = {
      email: profile.emails?.[0]?.value ?? '',
      firstName: profile.name?.givenName ?? '',
      lastName: profile.name?.familyName ?? '',
      facebookId: profile.id,
    };
    done(null, user);
  }
}
