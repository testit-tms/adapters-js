import { Attachment } from "../../common";

export interface IAttachmentsService {
  uploadAttachments(paths: string[]): Promise<Attachment[]>;
  uploadTextAttachment(content: string, fileName?: string): Promise<Attachment[]>;
}
