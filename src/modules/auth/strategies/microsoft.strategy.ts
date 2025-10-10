
// modules/auth/strategies/microsoft.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-microsoft';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MicrosoftStrategy extends PassportStrategy(Strategy, 'microsoft') {
  constructor(private configService: ConfigService) {
    super({
      clientID: configService.get('MICROSOFT_CLIENT_ID'),
      clientSecret: configService.get('MICROSOFT_CLIENT_SECRET'),
      callbackURL: `${configService.get('app.url')}/api/v1/auth/microsoft/callback`,
      scope: ['user.read'],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any, done: any) {
    const user = {
      provider: 'microsoft',
      providerId: profile.id,
      email: profile.emails[0].value,
      firstName: profile.name.givenName,
      lastName: profile.name.familyName,
      avatar: profile.photos[0]?.value,
      accessToken,
      refreshToken,
    };
    done(null, user);
  }
}
