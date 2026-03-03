export interface Parameter {
  name: string;
  value: string;
}

export interface StatusDetails {
  message?: string;
  trace?: string;
  actual?: string;
  expected?: string;
}

export enum Status {
  FAILED = "failed",
  BROKEN = "broken",
  PASSED = "passed",
  SKIPPED = "skipped",
}

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
