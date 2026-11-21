import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Attachment } from './support.types';

@Injectable()
export class AttachmentStorage {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly directory: string;

  constructor(config: ConfigService) {
    this.bucket = config.get('SUPPORT_S3_BUCKET', '');
    this.directory = resolve(config.get('SUPPORT_UPLOAD_DIR', './data/attachments'));
    this.client = new S3Client({ region: config.get('AWS_REGION', 'us-east-2') });
  }

  mode() {
    return this.bucket ? 's3' : 'local';
  }

  async save(caseId: string, file?: Express.Multer.File): Promise<Attachment> {
    if (!file || file.size === 0 || file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('Envie um PDF, PNG ou JPEG de até 5 MB.');
    }
    const b = file.buffer;
    const type =
      b.subarray(0, 5).toString() === '%PDF-'
        ? 'application/pdf'
        : b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
          ? 'image/png'
          : b[0] === 255 && b[1] === 216 && b[2] === 255
            ? 'image/jpeg'
            : undefined;
    if (!type || type !== file.mimetype) {
      throw new BadRequestException(
        'O conteúdo do arquivo não corresponde a um PDF, PNG ou JPEG válido.',
      );
    }
    const id = randomUUID();
    const key = `refunds/${caseId}/${id}`;
    if (this.bucket) {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: b,
          ContentType: type,
          ContentDisposition: 'attachment',
          ServerSideEncryption: 'AES256',
        }),
      );
    } else {
      await mkdir(this.directory, { recursive: true });
      await writeFile(resolve(this.directory, id), b, { mode: 0o600 });
    }
    return {
      id,
      key,
      storage: this.bucket ? 's3' : 'local',
      ...(this.bucket ? { bucket: this.bucket } : {}),
      type,
      size: file.size,
      name: file.originalname.replace(/[^a-zA-Z0-9._ -]/g, '_').slice(0, 100) || 'comprovante',
    };
  }

  async remove(file: Attachment) {
    if (file.storage === 's3') {
      await this.client.send(new DeleteObjectCommand({ Bucket: file.bucket, Key: file.key }));
    } else {
      await unlink(resolve(this.directory, file.id));
    }
  }

  async download(file: Attachment) {
    if (file.storage === 's3') {
      return {
        url: await getSignedUrl(
          this.client,
          new GetObjectCommand({
            Bucket: file.bucket,
            Key: file.key,
            ResponseContentDisposition: `attachment; filename="${file.name}"`,
          }),
          { expiresIn: 60 },
        ),
      };
    }
    return { bytes: await readFile(resolve(this.directory, file.id)) };
  }
}
