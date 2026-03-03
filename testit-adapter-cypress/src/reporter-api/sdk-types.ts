import type { Parameter, Status, StatusDetails } from "./model.js";
import { Label, Link } from "testit-js-commons";

type RuntimeMessageBase<T extends string> = { type: T };

export type RuntimeMetadataMessage = RuntimeMessageBase<"metadata"> & {
  data: {
    labels?: Label[];
    links?: Link[];
    tags?: string[];
    workItemIds?: string[];
    parameters?: Parameter[];
    description?: string;
    displayName?: string;
    title?: string;
    namespace?: string;
    classname?: string;
  };
};

export type RuntimeStartStepMessage = RuntimeMessageBase<"step_start"> & {
  data: { name: string; start: number };
};

export type RuntimeStopStepMessage = RuntimeMessageBase<"step_stop"> & {
  data: { stop: number; status: Status; statusDetails?: StatusDetails };
};

export type RuntimeAttachmentContentMessage = RuntimeMessageBase<"attachment_content"> & {
  data: {
    name: string;
    content: string;
    encoding: BufferEncoding;
    contentType: string;
    fileExtension?: string;
  };
};

export type RuntimeAttachmentPathMessage = RuntimeMessageBase<"attachment_path"> & {
  data: { name: string; path: string; contentType: string; fileExtension?: string };
};

export type RuntimeMessage =
  | RuntimeMetadataMessage
  | RuntimeStartStepMessage
  | RuntimeStopStepMessage
  | RuntimeAttachmentContentMessage
  | RuntimeAttachmentPathMessage
  | (RuntimeMessageBase<string> & { data?: unknown });

export interface TestPlanV1 {
  version: "1.0";
  tests: Array<{ id?: string | number; selector?: string }>;
}
