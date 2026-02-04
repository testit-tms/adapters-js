// @ts-ignore
import * as TestitApiClient from "testit-api-client";
import { BaseService, Utils, AdapterConfig, Attachment } from "../../common";
import { IAttachmentsService } from "./attachments.type";
import { Buffer } from "buffer";
import * as fs from "fs";

export class AttachmentsService extends BaseService implements IAttachmentsService {
  protected _client: TestitApiClient.AttachmentsApi;

  constructor(protected readonly config: AdapterConfig) {
    super(config);
    this._client = new TestitApiClient.AttachmentsApi();
    // Set the base path from config if provided
    if (this.config.url) {
      this._client.apiClient.basePath = this.config.url.replace(/\/+$/, "");
    }
  }

  public async uploadTextAttachment(content: string | Buffer, filename?: string): Promise<Attachment[]> {
    // Create a Buffer for the content
    const bufferContent = typeof content === "string" ? Buffer.from(content, "utf-8") : content;
    const fileName = filename ?? Utils.generateFileName();

    try {
      // Try to create a temporary file with the correct name to workaround filename issue
      const tempDir = Utils.createTempDir();
      const tempFilePath = `${tempDir}/${fileName}`;

      try {
        // Write buffer to temporary file
        fs.writeFileSync(tempFilePath, bufferContent);

        // Use the temporary file with the API client
        const fileStream = fs.createReadStream(tempFilePath);

        // @ts-ignore
        const response = await this._client.apiV2AttachmentsPost({ file: fileStream });

        const data = response.body || response;
        return [{ id: data.id }];
      } finally {
        // Clean up temporary file and directory
        try {
          if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
          }
          // Try to remove the temp directory
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
          // Verify file exists
          if (!fs.existsSync(path)) {
            throw new Error(`File not found: ${path}`);
          }

          // Create a read stream directly from the file
          const fileStream = Utils.readStream(path);

          // @ts-ignore
          const response = await this._client.apiV2AttachmentsPost({ file: fileStream });

          const data = response.body || response;
          return data.id;
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

    // Convert array of IDs to array of Attachment objects
    return attachmentIds.map((id) => ({ id }));
  }
}
