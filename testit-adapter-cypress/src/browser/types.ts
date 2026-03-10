import { Link } from "testit-js-commons";

export enum ContentType {
  PNG = "image/png",
  MP4 = "video/mp4",
  JSON = "application/json",
  TEXT = "text/plain",
}

export interface AttachmentOptions {
  contentType: ContentType | string;
  encoding?: BufferEncoding;
  fileExtension?: string;
  path?: string;
  body?: Buffer;
}

export interface TestRuntime {
  addLabels(...labels: string[]): PromiseLike<void>;
  addTags(...tags: string[]): PromiseLike<void>;
  addLinks(...links: Link[]): PromiseLike<void>;
  addWorkItemIds(...workItemIds: string[]): PromiseLike<void>;
  addParameter(name: string, value: string): PromiseLike<void>;
  addDescription(markdown: string): PromiseLike<void>;
  addTitle(markdown: string): PromiseLike<void>;
  addDisplayName(name: string): PromiseLike<void>;
  addAttachments(name: string, content: Buffer | string, options: AttachmentOptions): PromiseLike<void>;
  addAttachmentsFromPath(name: string, path: string, options: Omit<AttachmentOptions, "encoding">): PromiseLike<void>;
  addGlobalAttachments(name: string, content: Buffer | string, options: AttachmentOptions): PromiseLike<void>;
  addGlobalAttachmentsFromPath(name: string, path: string, options: Omit<AttachmentOptions, "encoding">): PromiseLike<void>;
  addMessage(message: string): PromiseLike<void>;
  step<T>(name: string, body: () => T | PromiseLike<T>): PromiseLike<T>;
}

const noop = { then: () => noop, catch: () => noop } as PromiseLike<void>;

export const noopRuntime: TestRuntime = {
  addLabels: () => noop,
  addTags: () => noop,
  addLinks: () => noop,
  addWorkItemIds: () => noop,
  addParameter: () => noop,
  addDescription: () => noop,
  addTitle: () => noop,
  addDisplayName: () => noop,
  addAttachments: () => noop,
  addAttachmentsFromPath: () => noop,
  addGlobalAttachments: () => noop,
  addGlobalAttachmentsFromPath: () => noop,
  addMessage: () => noop,
  step: <T>(_: string, body: () => T | PromiseLike<T>): PromiseLike<T> =>
    (Promise.resolve(body()) as unknown) as PromiseLike<T>,
};
