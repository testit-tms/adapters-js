import test from "@playwright/test";
import { Link, Label } from "testit-js-commons";

export interface MetadataMessage {
  workItemIds?: string[];
  displayName?: string;
  externalId?: string;
  title?: string;
  description?: string;
  labels?: Label[];
  links?: Link[];
  namespace?: string;
  classname?: string;
  addLinks?: Link[];
  addAttachments?: AttachmentMetadata[];
  addMessage?: string;
}

interface AttachmentMetadata {
  name: string;
  type: string;
  content: string;
  encoding: BufferEncoding;
}

interface AttachmentOptions {
  contentType: ContentType | string;
  fileExtension?: string;
}

enum ContentType {
  TEXT = "text/plain",
  XML = "application/xml",
  HTML = "text/html",
  CSV = "text/csv",
  TSV = "text/tab-separated-values",
  CSS = "text/css",
  URI = "text/uri-list",
  SVG = "image/svg+xml",
  PNG = "image/png",
  JSON = "application/json",
  ZIP = "application/zip",
  WEBM = "video/webm",
  JPEG = "image/jpeg",
  MP4 = "video/mp4",
}

export class testit {
  static async addAttachment(
    name: string,
    content: Buffer | string,
    options: ContentType | string | Pick<AttachmentOptions, "contentType">,
  ) {
    const contentType = typeof options === "string" ? options : options.contentType;
    await test.info().attach(name, {
      body: content,
      contentType,
    });
  }

  static async addMetadataAttachment(metadata: MetadataMessage) {
    await test.info().attach("tms-metadata.json", {
      contentType: "application/vnd.tms.metadata+json",
      body: Buffer.from(JSON.stringify(metadata), "utf8"),
    });
  }

  static async workItemIds(value: string[]) {
    await this.addMetadataAttachment({
      workItemIds: value,
    });
  }

  static async displayName(value: string) {
    await this.addMetadataAttachment({
      displayName: value,
    });
  }

  static async externalId(value: string) {
    await this.addMetadataAttachment({
      externalId: value,
    });
  }

  static async title(value: string) {
    await this.addMetadataAttachment({
      title: value,
    });
  }

  static async description(value: string) {
    await this.addMetadataAttachment({
      description: value,
    });
  }

  static async labels(value: Label[]) {
    await this.addMetadataAttachment({
      labels: value,
    });
  }

  static async links(value: Link[]) {
    await this.addMetadataAttachment({
      links: value,
    });
  }

  static async namespace(value: string) {
    await this.addMetadataAttachment({
      namespace: value,
    });
  }

  static async classname(value: string) {
    await this.addMetadataAttachment({
      classname: value,
    });
  }

  static async addLinks(value: Link[]) {
    await this.addMetadataAttachment({
      addLinks: value,
    });
  }

  static async addMessage(value: string) {
    await this.addMetadataAttachment({
      addMessage: value,
    });
  }
}
