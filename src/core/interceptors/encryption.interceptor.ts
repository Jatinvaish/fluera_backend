
// ============================================
// core/interceptors/encryption.interceptor.ts
// ============================================
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { EncryptionService } from 'src/common/encryption.service';

@Injectable()
export class EncryptionInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private encryptionService: EncryptionService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    
    const shouldDecrypt = this.reflector.getAllAndOverride<boolean>(
      'encryptedRequest',
      [context.getHandler(), context.getClass()],
    );

    if (shouldDecrypt && request.body) {
      try {
        const encryptedData = request.body.data;
        if (!encryptedData) {
          throw new BadRequestException('Encrypted data is required');
        }

        const decrypted = this.encryptionService.decrypt(encryptedData);
        request.body = JSON.parse(decrypted);
      } catch (error) {
        throw new BadRequestException('Failed to decrypt request data');
      }
    }

    return next.handle();
  }
}
