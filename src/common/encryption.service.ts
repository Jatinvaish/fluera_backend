import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as CryptoJS from 'crypto-js';

@Injectable()
export class EncryptionService {
  private masterKey: string;

  constructor(private configService: ConfigService) {
    const key = this.configService.get('encryption.key');
    if (!key) {
      throw new Error('ENCRYPTION_KEY not found in environment');
    }
    this.masterKey = key;
  }

  encrypt(text: string): string {
    return CryptoJS.AES.encrypt(text, this.masterKey).toString();
  }

  decrypt(encryptedData: string): string {
    const decrypted = CryptoJS.AES.decrypt(encryptedData, this.masterKey).toString(CryptoJS.enc.Utf8);
    return decrypted;
  }
}