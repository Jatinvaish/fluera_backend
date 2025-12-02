// ============================================
// src/common/controllers/file-upload.controller.ts - FASTIFY COMPATIBLE
// ============================================
import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  HttpCode,
  HttpStatus,
  BadRequestException,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/core/guards';
import { CurrentUser, TenantId, Unencrypted } from 'src/core/decorators';
import { R2Service } from '../services/r2.service';

@ApiTags('File Management')
@ApiBearerAuth()
@Controller('files')
@UseGuards(JwtAuthGuard)
@Unencrypted()
export class FileUploadController {
  constructor(private r2Service: R2Service) {}

  // ==================== UPLOAD ENDPOINTS ====================

  @Post('upload')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upload single file' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') userId: number,
    @TenantId() tenantId: number,
    @Body('folder') folder?: string,
    @Body('messageId') messageId?: number,
    @Body('generateThumbnail') generateThumbnail?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const result = await this.r2Service.uploadFile(file, {
      folder: folder || 'uploads',
      tenantId,
      userId,
      generateThumbnail: generateThumbnail === 'true',
    });

    // Save to database if messageId provided
    if (messageId) {
      const attachmentId = await this.r2Service.saveFileRecord(result, {
        tenantId,
        userId,
        messageId: +messageId,
      });

      return {
        success: true,
        message: 'File uploaded successfully',
        data: {
          ...result,
          attachmentId,
        },
      };
    }

    return {
      success: true,
      message: 'File uploaded successfully',
      data: result,
    };
  }

  @Post('upload-multiple')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upload multiple files' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('files', 10)) // Max 10 files
  async uploadMultipleFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser('id') userId: number,
    @TenantId() tenantId: number,
    @Body('folder') folder?: string,
    @Body('messageId') messageId?: number,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    const results = await this.r2Service.uploadMultipleFiles(files, {
      folder: folder || 'uploads',
      tenantId,
      userId,
    });

    // Save to database if messageId provided
    if (messageId) {
      const attachmentIds = await Promise.all(
        results.map((result) =>
          this.r2Service.saveFileRecord(result, {
            tenantId,
            userId,
            messageId: +messageId,
          }),
        ),
      );

      return {
        success: true,
        message: `${results.length} files uploaded successfully`,
        data: results.map((result, index) => ({
          ...result,
          attachmentId: attachmentIds[index],
        })),
      };
    }

    return {
      success: true,
      message: `${results.length} files uploaded successfully`,
      data: results,
    };
  }

  @Post('upload-avatar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upload user avatar' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') userId: number,
    @TenantId() tenantId: number,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate image
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Only image files are allowed for avatars');
    }

    const result = await this.r2Service.uploadFile(file, {
      folder: 'avatars',
      tenantId,
      userId,
      generateThumbnail: true,
    });

    return {
      success: true,
      message: 'Avatar uploaded successfully',
      data: result,
    };
  }

  // ==================== DOWNLOAD ENDPOINTS (Using Query Params) ====================

  @Get('download')
  @ApiOperation({ summary: 'Get file download URL' })
  @ApiQuery({ name: 'key', description: 'File key/path', example: 'uploads/tenant-1/2024-12-02/file.jpg' })
  async getDownloadUrl(@Query('key') key: string) {
    if (!key) {
      throw new BadRequestException('File key is required');
    }

    const url = await this.r2Service.getSignedUrl(key, 3600); // 1 hour

    return {
      success: true,
      data: {
        url,
        expiresIn: 3600,
      },
    };
  }

  @Get('metadata')
  @ApiOperation({ summary: 'Get file metadata' })
  @ApiQuery({ name: 'key', description: 'File key/path' })
  async getFileMetadata(@Query('key') key: string) {
    if (!key) {
      throw new BadRequestException('File key is required');
    }

    const metadata = await this.r2Service.getFileMetadata(key);

    return {
      success: true,
      data: metadata,
    };
  }

  // ==================== LIST ENDPOINTS ====================

  @Get('list')
  @ApiOperation({ summary: 'List files by prefix' })
  @ApiQuery({ name: 'prefix', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async listFiles(
    @Query('prefix') prefix?: string,
    @Query('limit') limit?: number,
  ) {
    const files = await this.r2Service.listFiles(prefix, limit);

    return {
      success: true,
      data: files,
      total: files.length,
    };
  }

  @Get('storage-usage')
  @ApiOperation({ summary: 'Get tenant storage usage' })
  async getStorageUsage(@TenantId() tenantId: number) {
    const usage = await this.r2Service.getTenantStorageUsage(tenantId);

    return {
      success: true,
      data: usage,
    };
  }

  // ==================== DELETE ENDPOINTS ====================

  @Delete('delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete file' })
  @ApiQuery({ name: 'key', description: 'File key/path to delete' })
  async deleteFile(@Query('key') key: string) {
    if (!key) {
      throw new BadRequestException('File key is required');
    }

    await this.r2Service.deleteFile(key);

    return {
      success: true,
      message: 'File deleted successfully',
    };
  }

  @Delete('bulk')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete multiple files' })
  async deleteMultipleFiles(@Body('keys') keys: string[]) {
    if (!keys || keys.length === 0) {
      throw new BadRequestException('No file keys provided');
    }

    await this.r2Service.deleteMultipleFiles(keys);

    return {
      success: true,
      message: `${keys.length} files deleted successfully`,
    };
  }

  @Delete('folder')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete entire folder' })
  @ApiQuery({ name: 'prefix', description: 'Folder prefix/path to delete' })
  async deleteFolder(@Query('prefix') prefix: string) {
    if (!prefix) {
      throw new BadRequestException('Folder prefix is required');
    }

    await this.r2Service.deleteFolder(prefix);

    return {
      success: true,
      message: 'Folder deleted successfully',
    };
  }

  // ==================== COPY/MOVE ENDPOINTS ====================

  @Post('copy')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Copy file' })
  async copyFile(
    @Body('sourceKey') sourceKey: string,
    @Body('destinationKey') destinationKey: string,
  ) {
    if (!sourceKey || !destinationKey) {
      throw new BadRequestException('Source and destination keys are required');
    }

    await this.r2Service.copyFile(sourceKey, destinationKey);

    return {
      success: true,
      message: 'File copied successfully',
    };
  }

  @Post('move')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Move file' })
  async moveFile(
    @Body('sourceKey') sourceKey: string,
    @Body('destinationKey') destinationKey: string,
  ) {
    if (!sourceKey || !destinationKey) {
      throw new BadRequestException('Source and destination keys are required');
    }

    await this.r2Service.moveFile(sourceKey, destinationKey);

    return {
      success: true,
      message: 'File moved successfully',
    };
  }

  // ==================== ATTACHMENT ENDPOINTS ====================

  @Get('attachments/:messageId')
  @ApiOperation({ summary: 'Get message attachments' })
  async getMessageAttachments(
    @Param('messageId', ParseIntPipe) messageId: number,
  ) {
    const attachments = await this.r2Service['sqlService'].execute(
      'sp_GetMessageAttachments_Fast',
      { messageId },
    );

    return {
      success: true,
      data: attachments,
      total: attachments.length,
    };
  }
}