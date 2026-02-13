import { randomUUID } from "crypto";
import test from "@playwright/test";
import { Link, Label, Attachment } from "testit-js-commons";

export interface MetadataMessage {
  workItemIds?: string[];
  displayName?: string;
  externalId?: string;
  title?: string;
  description?: string;
  labels?: Label[];
  tags?: string[];
  links?: Link[];
  namespace?: string;
  classname?: string;
  addLinks?: Link[];
  addAttachments?: Attachment[];
  addMessage?: string;
  params?: Parameters;
  externalKey?: string;
}

interface AttachmentOptions {
  contentType: ContentType | string;
  fileExtension?: string;
}

export enum ContentType {
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
  MD =  "text/markdown",
}

export enum Extensions {
    PNG = ".png",
    JPEG = ".jpg",
    ZIP = ".zip",
    WEBM = ".webm",
    MD = ".md",
}

type Parameters = Record<string, string>;

export class testit {
  private static async addMetadataAttachment(metadata: MetadataMessage) {
    await test.info().attach("tms-metadata.json", {
      contentType: "application/vnd.tms.metadata+json",
      body: Buffer.from(JSON.stringify(metadata), "utf8"),
    });
  }

  static async addAttachment(
    name: string,
    content: Buffer | string,
    options: ContentType | string | Pick<AttachmentOptions, "contentType">,
  ) {
    const stepName = `stepattach_${randomUUID()}_${name}`;

    const contentType = typeof options === "string" ? options : options.contentType;
    await this.step(stepName, async () => {
      await test.info().attach(stepName, {
        body: content,
        contentType,
      });
    });
  }

  private static async mapParams(params: any) {
    switch (typeof params) {
      case 'string':
      case 'bigint':
      case 'number':
      case 'boolean':
        return { value: params.toString() };
      case 'object':
        if (params === null) {
          return {};
        }
        return Object.keys(params).reduce((acc, key) => {
          acc[key] = params[key].toString();
          return acc;
        }, {} as Parameters);
      default:
        return {};
    }
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

  static async labels(value: string[]) {
    await this.addMetadataAttachment({
      labels: value.map((label) => ({ name: label })),
    });
  }

  static async tags(value: string[]) {
    await this.addMetadataAttachment({
      tags: value,
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

  static async params(value: any) {
    await this.addMetadataAttachment({
      params: await this.mapParams(value),
    });
  }

  static step<T>(name: string, body: () => Promise<T>): Promise<T> {
    return test.step(name, body);
  }
}
