// common/common.module.ts
import { Module, Global } from '@nestjs/common';
import { EncryptionService } from './encryption.service';
import { HashingService } from './hashing.service';
import { EmailService } from './email.service';

@Global()
@Module({
  providers: [EncryptionService, HashingService, EmailService],
  exports: [EncryptionService, HashingService, EmailService],
})
export class CommonModule {}
