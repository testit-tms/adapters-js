import type { IClient } from "../../client";
import type { Link, Attachment } from "../../common";
import type { IAdditions } from "./additions.type";

export class Additions implements IAdditions {
  public links: Link[] = [];
  public attachments: Attachment[] = [];
  public messages: string[] = [];

  constructor(private client: IClient) {}

  async addAttachments(paths: string[]): Promise<Attachment[]>;
  async addAttachments(content: string | Buffer, fileName?: string): Promise<Attachment[]>;
  async addAttachments(pathsOrContent: string[] | string | Buffer, fileName?: string): Promise<Attachment[]> {
    const ids = Array.isArray(pathsOrContent)
      ? await this.client.attachments.uploadAttachments(pathsOrContent)
      : await this.client.attachments.uploadTextAttachment(pathsOrContent, fileName);

    this.attachments.push(...ids);

    return ids;
  }

  addLinks(link: Link): void;
  addLinks(links: Link[]): void;
  addLinks(links: Link | Link[]): void {
    Array.isArray(links) ? this.links.push(...links) : this.links.push(links);
  }

  addMessage(message: string): void {
    this.messages.push(message);
  }

  clear() {
    this.attachments = [];
    this.messages = [];
    this.links = [];
  }
}
