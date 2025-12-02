// ============================================
// src/common/file-upload.module.ts
// ============================================
import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { R2Service } from './services/r2.service';
import { FileUploadController } from './controllers/file-upload.controller';
import r2Config from '../config/r2.config';

@Global() // ✅ Make available globally
@Module({
  imports: [ConfigModule.forFeature(r2Config)],
  controllers: [FileUploadController],
  providers: [R2Service],
  exports: [R2Service], // ✅ Export for use in other modules
})
export class FileUploadModule {}