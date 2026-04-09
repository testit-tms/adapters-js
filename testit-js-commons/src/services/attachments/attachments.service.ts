// @ts-ignore
import * as TestitApiClient from "testit-api-client";
import { BaseService, Utils, AdapterConfig, Attachment } from "../../common";
import { IAttachmentsService } from "./attachments.type";
import { Buffer } from "buffer";
import * as fs from "fs";

const UPLOAD_MAX_ATTEMPTS = 3;
const UPLOAD_RETRY_BASE_MS = 500;
/** Minimum HTTP timeout for attachment POST (ms); reduces false timeouts on slow TLS. */
const UPLOAD_CLIENT_TIMEOUT_MS = 120000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientAttachmentError(err: any): boolean {
  const status = err?.response?.status;
  if (typeof status === "number" && status >= 400 && status < 500) return false;
  if (typeof status === "number" && status >= 500) return true;
  const code = err?.code;
  if (code === "ECONNRESET" || code === "ETIMEDOUT" || code === "EPIPE" || code === "ECONNABORTED") return true;
  if (err?.errno === -104) return true;
  const msg = err?.message;
  if (typeof msg === "string" && /socket hang up|ECONNRESET|ETIMEDOUT|ECONNREFUSED/i.test(msg)) return true;
  return false;
}

async function withUploadRetry<T>(fn: () => Promise<T>): Promise<T> {
  let last: unknown;
  for (let attempt = 1; attempt <= UPLOAD_MAX_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (!isTransientAttachmentError(e) || attempt === UPLOAD_MAX_ATTEMPTS) {
        throw e;
      }
      await sleep(UPLOAD_RETRY_BASE_MS * attempt);
    }
  }
  throw last;
}

export class AttachmentsService extends BaseService implements IAttachmentsService {
  protected _client: TestitApiClient.AttachmentsApi;

  constructor(protected readonly config: AdapterConfig) {
    super(config);
    this._client = new TestitApiClient.AttachmentsApi();
    if (this.config.url) {
      this._client.apiClient.basePath = this.config.url.replace(/\/+$/, "");
    }
    const t = this._client.apiClient.timeout;
    this._client.apiClient.timeout = Math.max(typeof t === "number" ? t : 60000, UPLOAD_CLIENT_TIMEOUT_MS);
  }

  public async uploadTextAttachment(content: string | Buffer, filename?: string): Promise<Attachment[]> {
    const bufferContent = typeof content === "string" ? Buffer.from(content, "utf-8") : content;
    const fileName = filename ?? Utils.generateFileName();

    try {
      const tempDir = Utils.createTempDir();
      const tempFilePath = `${tempDir}/${fileName}`;

      try {
        fs.writeFileSync(tempFilePath, bufferContent);

        const id = await withUploadRetry(async () => {
          const fileStream = fs.createReadStream(tempFilePath);
          try {
            // @ts-ignore
            const response = await this._client.apiV2AttachmentsPost({ file: fileStream });
            const data = response.body || response;
            return data.id as string;
          } finally {
            fileStream.destroy();
          }
        });

        return [{ id }];
      } finally {
        try {
          if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
          }
          if (fs.existsSync(tempDir)) {
            fs.rmdirSync(tempDir);
          }
        } catch (cleanupError) {
          console.warn("Failed to cleanup temporary files:", cleanupError);
        }
      }
    } catch (error: any) {
      console.error("Error uploading text attachment:", error);
      if (error.response) {
        console.error("Response details:", {
          status: error.response.status,
          text: error.response.text,
        });
      }
      throw error;
    }
  }

  public async uploadAttachments(paths: string[]): Promise<Attachment[]> {
    const attachmentIds = await Promise.all(
      paths.map(async (path) => {
        try {
          if (!fs.existsSync(path)) {
            throw new Error(`File not found: ${path}`);
          }

          const id = await withUploadRetry(async () => {
            const fileStream = Utils.readStream(path);
            try {
              // @ts-ignore
              const response = await this._client.apiV2AttachmentsPost({ file: fileStream });
              const data = response.body || response;
              return data.id as string;
            } finally {
              fileStream.destroy();
            }
          });

          return id;
        } catch (error: any) {
          console.error(`Error uploading attachment ${path}:`, error);
          if (error.response) {
            console.error("Response details:", {
              status: error.response.status,
              text: error.response.text,
            });
          }
          throw error;
        }
      })
    );

    return attachmentIds.map((id: string) => ({ id }));
  }
}
