// @ts-ignore
import TestitApiClient from "testit-api-client";
import { BaseService, Utils, AdapterConfig, Attachment } from "../../common";
import { IAttachmentsService } from "./attachments.type";
import { Buffer } from "buffer";


export class AttachmentsService extends BaseService implements IAttachmentsService {
  protected _client;

  constructor(protected readonly config: AdapterConfig) {
    super(config);
    this._client = new TestitApiClient.AttachmentsApi()
  }

  public async uploadTextAttachment(content: string | Buffer, filename?: string): Promise<Attachment[]> {
    const request = {
      value: typeof content === "string" ? Buffer.from(content, "utf-8") : content,
      options: { filename: filename ?? Utils.generateFileName() },
    };
    // @ts-ignore
    return await this._client.apiV2AttachmentsPost({file: request}).then(({ body }) => [{ id: body.id }]);
  }

  public async uploadAttachments(paths: string[]): Promise<Attachment[]> {
    return await Promise.all(
      paths.map((path) => {
        return this._client
          // @ts-ignore
          .apiV2AttachmentsPost({file: Utils.readStream(path) })
          // @ts-ignore
          .then(({ body }) => ({ id: body.id }));
      })
    );
  }
}
