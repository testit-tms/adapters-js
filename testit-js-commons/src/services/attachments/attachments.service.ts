// eslint-disable-next-line @typescript-eslint/no-var-requires
const AdaptersApi = require("../../adapters-api/dist/index");
import { BaseService, Utils, AdapterConfig, Attachment, withHttpRetry } from "../../common";
import { IAttachmentsService } from "./attachments.type";
import { Buffer } from "buffer";
import * as fs from "fs";
import logger from "../../logger";

const UPLOAD_RETRY_OPTIONS = { maxAttempts: 5, delayMs: 500, backoff: true } as const;
/** Minimum HTTP timeout for attachment POST (ms); reduces false timeouts on slow TLS. */
const UPLOAD_CLIENT_TIMEOUT_MS = 120000;

export class AttachmentsService extends BaseService implements IAttachmentsService {
  protected _client: any;

  constructor(protected readonly config: AdapterConfig) {
    super(config);
    this._client = new AdaptersApi.AttachmentsApi(AdaptersApi.ApiClient.instance);
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

        logger.debug("[attachments] upload text", { fileName, bytes: bufferContent.length });
        const id = await withHttpRetry(
          async () => {
            const fileStream = fs.createReadStream(tempFilePath);
            try {
              // @ts-ignore
              const response = await this._client.adaptersAttachmentsPost({ file: fileStream });
              const data = response?.body || response;
              return data.id as string;
            } finally {
              fileStream.destroy();
            }
          },
          { ...UPLOAD_RETRY_OPTIONS, label: `uploadText:${fileName}` },
        );
        logger.debug("[attachments] upload text ok", { fileName, id });

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
          logger.warn("Failed to cleanup temporary files:", cleanupError);
        }
      }
    } catch (error: any) {
      logger.error("Error uploading text attachment:", error);
      if (error.response) {
        logger.error("Response details:", {
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

        logger.debug("[attachments] upload file", { path });
        const id = await withHttpRetry(
          async () => {
            const fileStream = Utils.readStream(path);
            try {
              // @ts-ignore
              const response = await this._client.adaptersAttachmentsPost({ file: fileStream });
              const data = response?.body || response;
              return data.id as string;
            } finally {
              fileStream.destroy();
            }
          },
          { ...UPLOAD_RETRY_OPTIONS, label: `uploadFile:${path}` },
        );
        logger.debug("[attachments] upload file ok", { path, id });

        attachmentIds.push(id);
      } catch (error: any) {
        logger.error(`Error uploading attachment ${path}:`, error);
        if (error.response) {
          logger.error("Response details:", {
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
