import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3: S3Client;
  private readonly bucketName: string;
  private readonly publicUrl: string;

  constructor(private readonly configService: ConfigService) {
    const accessKeyId = this.configService.getOrThrow<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.getOrThrow<string>('R2_SECRET_ACCESS_KEY');
    const endpoint = this.configService.getOrThrow<string>('R2_ENDPOINT');

    this.bucketName = this.configService.getOrThrow<string>('R2_BUCKET_NAME');
    this.publicUrl = this.configService.getOrThrow<string>('R2_PUBLIC_URL');

    this.s3 = new S3Client({
      region: 'auto',
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    this.logger.log(`StorageService initialized — bucket: ${this.bucketName}`);
  }

  /**
   * Upload a file buffer to Cloudflare R2.
   * @returns The public URL of the uploaded file.
   */
  async uploadFile(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    folder = 'advertisements',
  ): Promise<string> {
    const ext = this.extractExtension(originalName);
    const key = `${folder}/${randomUUID()}${ext}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      }),
    );

    const url = `${this.publicUrl.replace(/\/$/, '')}/${key}`;
    this.logger.log(`Uploaded file → ${url}`);
    return url;
  }

  /**
   * Delete a file from Cloudflare R2 by its public URL.
   */
  async deleteFile(fileUrl: string): Promise<void> {
    const key = this.extractKeyFromUrl(fileUrl);
    if (!key) {
      this.logger.warn(`Could not extract key from URL: ${fileUrl}`);
      return;
    }

    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      }),
    );

    this.logger.log(`Deleted file → ${key}`);
  }

  private extractExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot >= 0 ? filename.substring(lastDot) : '';
  }

  private extractKeyFromUrl(url: string): string | null {
    try {
      const baseUrl = this.publicUrl.replace(/\/$/, '');
      if (url.startsWith(baseUrl)) {
        return url.substring(baseUrl.length + 1); // +1 for the trailing /
      }
      // Fallback: extract everything after the last domain segment
      const urlObj = new URL(url);
      return urlObj.pathname.substring(1); // remove leading /
    } catch {
      return null;
    }
  }
}
