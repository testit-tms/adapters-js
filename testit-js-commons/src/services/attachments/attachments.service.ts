import { AttachmentsApi, AttachmentsApiApiKeys, RequestDetailedFile } from "testit-api-client";
import { BaseService, Utils, AdapterConfig, Attachment } from "../../common";
import { IAttachmentsService } from "./attachments.type";
import { Buffer } from "buffer";

const apiKey = AttachmentsApiApiKeys["Bearer or PrivateToken"];

export class AttachmentsService extends BaseService implements IAttachmentsService {
  protected _client: AttachmentsApi;

  constructor(protected readonly config: AdapterConfig) {
    super(config);
    this._client = new AttachmentsApi(config.url);
    this._client.setApiKey(apiKey, `PrivateToken ${config.privateToken}`);
    if (config.certValidation !== undefined) {
      this._client.setRejectUnauthorized(config.certValidation);
    }
  }

  public async uploadTextAttachment(content: string | Buffer, filename?: string): Promise<Attachment[]> {
    const request: RequestDetailedFile = {
      value: typeof content === "string" ? Buffer.from(content, "utf-8") : content,
      options: { filename: filename ?? Utils.generateFileName() },
    };

    return await this._client.apiV2AttachmentsPost(request).then(({ body }) => [{ id: body.id }]);
  }

  public async uploadAttachments(paths: string[]): Promise<Attachment[]> {
    return await Promise.all(
      paths.map((path) => {
        const extension = Utils.getExtName(path);

        const headers: { [key: string]: string } = {};

        if (extension.search("txt") >= 0) {
          headers["Content-Type"] = "text/plain";
        }

        if (extension.search(/jp[e?]g/) >= 0) {
          headers["Content-Type"] = "image";
        }

        return this._client
          .apiV2AttachmentsPost(Utils.readStream(path), { headers })
          .then(({ body }) => ({ id: body.id }));
      })
    );
  }
}
