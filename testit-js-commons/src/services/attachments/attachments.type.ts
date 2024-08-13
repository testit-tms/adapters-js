import { Attachment } from "../../common";

export interface IAttachmentsService {
  uploadAttachments(paths: string[]): Promise<Attachment[]>;
  uploadTextAttachment(content: string | Buffer, fileName?: string): Promise<Attachment[]>;
}
