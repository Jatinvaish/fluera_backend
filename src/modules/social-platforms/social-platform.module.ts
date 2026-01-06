// src/modules/social-platforms/social-platform.module.ts
import { Module } from '@nestjs/common';
import { SocialPlatformController } from './social-platform.controller';
import { SocialPlatformService } from './social-platform.service';
import { InstagramService } from './instagram.service';
import { YouTubeService } from './youtube.service';
import { FacebookService } from './facebook.service';
import { TikTokService } from './tiktok.service';
import { TwitterService } from './twitter.service';
import { TwitchService } from './twitch.service';

@Module({
  controllers: [SocialPlatformController],
  providers: [
    SocialPlatformService,
    InstagramService,
    YouTubeService,
    TikTokService,
    FacebookService,
    TwitterService,
    TwitchService
  ],
  exports: [SocialPlatformService]
})
export class SocialPlatformModule {}