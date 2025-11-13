// common/common.module.ts
import { Module, Global } from '@nestjs/common';
import { EncryptionService } from './encryption.service';
import { HashingService } from './hashing.service';
import { EmailService } from 'src/modules/email-templates/email.service';
import { ChatEncryptionService } from './chat-encryption.service';

@Global()
@Module({
  providers: [EncryptionService, ChatEncryptionService, HashingService, EmailService],
  exports: [EncryptionService, ChatEncryptionService, HashingService, EmailService],
})
export class CommonModule {}
