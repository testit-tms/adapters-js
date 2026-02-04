// @ts-ignore
import * as TestitApiClient from "testit-api-client";
import superagent from "superagent";
import { BaseService, Utils, AdapterConfig, Attachment } from "../../common";
import { IAttachmentsService } from "./attachments.type";
import { Buffer } from "buffer";

export class AttachmentsService extends BaseService implements IAttachmentsService {
  protected _client;

  constructor(protected readonly config: AdapterConfig) {
    super(config);
    this._client = new TestitApiClient.AttachmentsApi();
  }

  public async uploadTextAttachment(content: string | Buffer, filename?: string): Promise<Attachment[]> {
    // Create a Buffer for the content
    const bufferContent = typeof content === "string" ? Buffer.from(content, "utf-8") : content;
    const fileName = filename ?? Utils.generateFileName();

    // Direct superagent request with proper filename support
    const url = `${this._client.apiClient.basePath}/api/v2/attachments`;

    try {
      console.log(`Uploading text attachment: ${fileName}`, {
        url,
        contentType: typeof content,
        contentLength: bufferContent.length,
      });

      const response = await superagent
        .post(url)
        .set("Authorization", `PrivateToken ${this.config.privateToken}`)
        .attach("file", bufferContent, fileName);

      const data = response.body || response;
      console.log(`Successfully uploaded text attachment: ${data.id}`);
      return [{ id: data.id }];
    } catch (error: any) {
      console.error("Error uploading text attachment:", error);
      if (error.response) {
        console.error("Response error details:", {
          status: error.response.status,
          text: error.response.text,
          headers: error.response.headers,
        });
      }
      throw error;
    }
  }

  public async uploadAttachments(paths: string[]): Promise<Attachment[]> {
    const attachmentIds = await Promise.all(
      paths.map(async (path) => {
        // For Node.js, we need to pass the buffer directly with proper filename
        const fileBuffer = Utils.readBufferSync(path);
        const fileName = Utils.getFileName(path);

        // Direct superagent request with proper filename support
        const url = `${this._client.apiClient.basePath}/api/v2/attachments`;

        try {
          console.log(`Uploading file attachment: ${fileName}`, {
            url,
            filePath: path,
            contentLength: fileBuffer.length,
          });

          const response = await superagent
            .post(url)
            .set("Authorization", `PrivateToken ${this.config.privateToken}`)
            .attach("file", fileBuffer, fileName);

          const data = response.body || response;
          console.log(`Successfully uploaded file attachment: ${data.id}`);
          return data.id;
        } catch (error: any) {
          console.error(`Error uploading attachment ${path}:`, error);
          if (error.response) {
            console.error("Response error details:", {
              status: error.response.status,
              text: error.response.text,
              headers: error.response.headers,
            });
          }
          throw error;
        }
      })
    );

    // Convert array of IDs to array of Attachment objects
    return attachmentIds.map((id: any) => ({ id }));
  }
}
