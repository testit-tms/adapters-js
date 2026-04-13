// @ts-ignore
import * as TestitApiClient from "testit-api-client";
import { BaseService, Utils, AdapterConfig, Attachment } from "../../common";
import { IAttachmentsService } from "./attachments.type";
import { Buffer } from "buffer";
import * as fs from "fs";

const UPLOAD_MAX_ATTEMPTS = 5;
const UPLOAD_RETRY_BASE_MS = 500;
/** Minimum HTTP timeout for attachment POST (ms); reduces false timeouts on slow TLS. */
const UPLOAD_CLIENT_TIMEOUT_MS = 120000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function unwrapAttachmentError(err: any): any {
  if (!err || typeof err !== "object") {
    return err;
  }
  const nested = (err as { error?: unknown }).error;
  if (nested instanceof Error || (nested && typeof nested === "object")) {
    return nested;
  }
  const cause = (err as { cause?: unknown }).cause;
  if (cause instanceof Error || (cause && typeof cause === "object")) {
    return cause;
  }
  return err;
}

function isTransientAttachmentError(err: any): boolean {
  const e = unwrapAttachmentError(err);
  const status = e?.response?.status ?? err?.response?.status;
  if (typeof status === "number" && status >= 400 && status < 500) return false;
  if (typeof status === "number" && status >= 500) return true;
  const code = e?.code ?? err?.code;
  if (code === "ECONNRESET" || code === "ETIMEDOUT" || code === "EPIPE" || code === "ECONNABORTED") return true;
  if (e?.errno === -104 || err?.errno === -104) return true;
  const msg = e?.message ?? err?.message;
  if (typeof msg === "string" && /socket hang up|ECONNRESET|ETIMEDOUT|ECONNREFUSED|read ECONNRESET/i.test(msg)) {
    return true;
  }
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
    const attachmentIds: string[] = [];
    for (const path of paths) {
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

        attachmentIds.push(id);
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
    }

    return attachmentIds.map((id: string) => ({ id }));
  }
}
