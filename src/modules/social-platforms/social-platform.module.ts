import { Module } from '@nestjs/common';
import { SocialPlatformController } from './social-platform.controller';
import { SocialPlatformService } from './social-platform.service';
import { InstagramService } from './instagram.service';
import { YouTubeService } from './youtube.service';
import { FacebookService } from './facebook.service';
import { TikTokService } from './tiktok.service';
import { TwitterService } from './twitter.service';

@Module({
  controllers: [SocialPlatformController],
  providers: [
    SocialPlatformService,
    InstagramService,
    YouTubeService,
    TikTokService,
    FacebookService,
    TwitterService,
    // Add other platform services here as you implement them
  ],
  exports: [SocialPlatformService]
})
export class SocialPlatformModule {}