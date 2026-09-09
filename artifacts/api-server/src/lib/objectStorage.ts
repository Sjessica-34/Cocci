import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import {
  CopyObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import {
  canAccessObject,
  getObjectAclPolicy,
  ObjectAclPolicy,
  ObjectPermission,
  ObjectStorageFile,
  ObjectStorageMetadata,
  setObjectAclPolicy,
} from './objectAcl';

const DEFAULT_PRIVATE_PREFIX = 'objects';
const DEFAULT_PUBLIC_PREFIX = 'public';
const UPLOAD_URL_TTL_SECONDS = 900;

let objectStorageClient: S3Client | undefined;

export class ObjectNotFoundError extends Error {
  constructor() {
    super('Object not found');
    this.name = 'ObjectNotFoundError';
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

class R2ObjectFile implements ObjectStorageFile {
  public readonly name: string;

  constructor(
    private readonly client: S3Client,
    private readonly bucketName: string,
    private readonly objectName: string,
  ) {
    this.name = `s3://${bucketName}/${objectName}`;
  }

  async exists(): Promise<[boolean]> {
    try {
      await this.head();
      return [true];
    } catch (error) {
      if (isNotFoundError(error)) return [false];
      throw error;
    }
  }

  async getMetadata(): Promise<[ObjectStorageMetadata]> {
    const metadata = await this.head();
    return [{
      contentType: metadata.ContentType,
      size: metadata.ContentLength,
      metadata: metadata.Metadata,
    }];
  }

  async setMetadata(metadata: { metadata: Record<string, string> }): Promise<void> {
    const current = await this.head();
    await this.client.send(new CopyObjectCommand({
      Bucket: this.bucketName,
      Key: this.objectName,
      CopySource: encodeURIComponent(`${this.bucketName}/${this.objectName}`),
      MetadataDirective: 'REPLACE',
      Metadata: {
        ...(current.Metadata ?? {}),
        ...metadata.metadata,
      },
      ContentType: current.ContentType,
      CacheControl: current.CacheControl,
      ContentDisposition: current.ContentDisposition,
      ContentEncoding: current.ContentEncoding,
      ContentLanguage: current.ContentLanguage,
      Expires: current.Expires,
    }));
  }

  async getObjectBody(): Promise<unknown> {
    try {
      const response = await this.client.send(new GetObjectCommand({
        Bucket: this.bucketName,
        Key: this.objectName,
      }));
      if (!response.Body) throw new ObjectNotFoundError();
      return response.Body;
    } catch (error) {
      if (isNotFoundError(error)) throw new ObjectNotFoundError();
      throw error;
    }
  }

  private async head() {
    try {
      return await this.client.send(new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: this.objectName,
      }));
    } catch (error) {
      if (isNotFoundError(error)) throw new ObjectNotFoundError();
      throw error;
    }
  }
}

export class ObjectStorageService {
  getPublicObjectSearchPaths(): Array<string> {
    const pathsStr =
      process.env.R2_PUBLIC_PREFIXES ??
      process.env.PUBLIC_OBJECT_SEARCH_PATHS ??
      DEFAULT_PUBLIC_PREFIX;
    const paths = Array.from(
      new Set(
        pathsStr
          .split(',')
          .map((path) => normalizePrefix(path))
          .filter((path) => path.length > 0),
      ),
    );
    if (paths.length === 0) {
      throw new Error('R2_PUBLIC_PREFIXES must contain at least one prefix');
    }
    return paths;
  }

  /**
   * Kept as a method with the previous service contract. It now returns an
   * R2 object prefix rather than a Replit bucket path.
   */
  getPrivateObjectDir(): string {
    return normalizePrefix(process.env.R2_PRIVATE_PREFIX ?? DEFAULT_PRIVATE_PREFIX);
  }

  async searchPublicObject(filePath: string): Promise<ObjectStorageFile | null> {
    const { client, bucketName } = getR2StorageConfig();
    const safePath = normalizeObjectName(filePath);
    for (const searchPath of this.getPublicObjectSearchPaths()) {
      const file = new R2ObjectFile(
        client,
        bucketName,
        `${searchPath}/${safePath}`,
      );
      const [exists] = await file.exists();
      if (exists) return file;
    }
    return null;
  }

  async downloadObject(
    file: ObjectStorageFile,
    cacheTtlSec: number = 3600,
  ): Promise<Response> {
    const [metadata] = await file.getMetadata();
    const aclPolicy = await getObjectAclPolicy(file);
    const isPublic = aclPolicy?.visibility === 'public';
    const nodeBody = await file.getObjectBody();
    const webStream = toWebStream(nodeBody);

    const headers: Record<string, string> = {
      'Content-Type': metadata.contentType || 'application/octet-stream',
      'Cache-Control': `${isPublic ? 'public' : 'private'}, max-age=${cacheTtlSec}`,
    };
    if (metadata.size !== undefined) {
      headers['Content-Length'] = String(metadata.size);
    }

    return new Response(webStream, { headers });
  }

  async getObjectEntityUploadURL(contentType?: string): Promise<string> {
    const { client, bucketName } = getR2StorageConfig();
    const objectName = `${this.getPrivateObjectDir()}/uploads/${randomUUID()}`;
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: objectName,
      ...(contentType ? { ContentType: contentType } : {}),
    });
    return getSignedUrl(client, command, { expiresIn: UPLOAD_URL_TTL_SECONDS });
  }

  async getObjectEntityFile(objectPath: string): Promise<R2ObjectFile> {
    if (!objectPath.startsWith('/objects/')) {
      throw new ObjectNotFoundError();
    }

    const entityId = normalizeObjectName(objectPath.slice('/objects/'.length));
    if (!entityId) throw new ObjectNotFoundError();

    const { client, bucketName } = getR2StorageConfig();
    const objectFile = new R2ObjectFile(
      client,
      bucketName,
      `${this.getPrivateObjectDir()}/${entityId}`,
    );
    const [exists] = await objectFile.exists();
    if (!exists) throw new ObjectNotFoundError();
    return objectFile;
  }

  normalizeObjectEntityPath(rawPath: string): string {
    if (rawPath.startsWith('/objects/')) return rawPath;
    if (!rawPath.startsWith('http://') && !rawPath.startsWith('https://')) {
      return rawPath;
    }

    const url = new URL(rawPath);
    const bucketName = getR2StorageConfig().bucketName;
    let objectName = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    if (objectName.startsWith(`${bucketName}/`)) {
      objectName = objectName.slice(bucketName.length + 1);
    }

    const privatePrefix = `${this.getPrivateObjectDir()}/`;
    if (!objectName.startsWith(privatePrefix)) {
      throw new Error('R2 upload URL does not point to the private object prefix');
    }
    return `/objects/${objectName.slice(privatePrefix.length)}`;
  }

  async trySetObjectEntityAclPolicy(
    rawPath: string,
    aclPolicy: ObjectAclPolicy,
  ): Promise<string> {
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    if (!normalizedPath.startsWith('/')) return normalizedPath;

    const objectFile = await this.getObjectEntityFile(normalizedPath);
    await setObjectAclPolicy(objectFile, aclPolicy);
    return normalizedPath;
  }

  async canAccessObjectEntity({
    userId,
    objectFile,
    requestedPermission,
  }: {
    userId?: string;
    objectFile: ObjectStorageFile;
    requestedPermission?: ObjectPermission;
  }): Promise<boolean> {
    return canAccessObject({
      userId,
      objectFile,
      requestedPermission: requestedPermission ?? ObjectPermission.READ,
    });
  }
}

function getR2StorageConfig(): {
  client: S3Client;
  bucketName: string;
} {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const endpoint =
    process.env.R2_ENDPOINT?.trim() ||
    (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '');
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucketName = process.env.R2_BUCKET_NAME?.trim();

  if (!endpoint) {
    throw new Error('R2_ENDPOINT or R2_ACCOUNT_ID must be configured');
  }
  if (!accessKeyId || !secretAccessKey || !bucketName) {
    throw new Error(
      'R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME must be configured',
    );
  }

  if (!objectStorageClient) {
    objectStorageClient = new S3Client({
      region: 'auto',
      endpoint,
      // R2 presigned browser uploads do not provide a checksum header. The
      // AWS SDK otherwise adds an empty CRC32 checksum to the signed URL.
      requestChecksumCalculation: 'WHEN_REQUIRED',
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  return { client: objectStorageClient, bucketName };
}

function normalizePrefix(value: string): string {
  return value.trim().replace(/^\/+|\/+$/g, '');
}

function normalizeObjectName(value: string): string {
  const normalized = value.trim().replace(/^\/+/, '');
  if (
    !normalized ||
    normalized.split('/').some((part) => part === '..' || part === '.')
  ) {
    throw new ObjectNotFoundError();
  }
  return normalized;
}

function toWebStream(body: unknown): ReadableStream {
  const candidate = body as {
    transformToWebStream?: () => ReadableStream;
  };
  if (typeof candidate.transformToWebStream === 'function') {
    return candidate.transformToWebStream();
  }
  return Readable.toWeb(body as NodeJS.ReadableStream) as ReadableStream;
}

function isNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as {
    name?: string;
    $metadata?: { httpStatusCode?: number };
  };
  return (
    candidate.name === 'NotFound' ||
    candidate.name === 'NoSuchKey' ||
    candidate.$metadata?.httpStatusCode === 404
  );
}