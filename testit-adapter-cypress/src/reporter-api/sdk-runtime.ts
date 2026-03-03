import type { AttachmentOptions, StatusDetails } from "./model.js";
import { Label, Link } from "testit-js-commons";

export interface TestRuntime {
  addLabels(...labels: Label[]): PromiseLike<void>;
  addTags(...tags: String[]): PromiseLike<void>;
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
  addMessage(details: StatusDetails): PromiseLike<void>;
  logStep(name: string, status?: import("./model.js").Status, error?: Error): PromiseLike<void>;
  step<T>(name: string, body: () => T | PromiseLike<T>): PromiseLike<T>;
  stepDisplayName(name: string): PromiseLike<void>;
  stepParameter(name: string, value: string): PromiseLike<void>;
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
  logStep: () => noop,
  step: <T>(_: string, body: () => T | PromiseLike<T>): PromiseLike<T> =>
    (Promise.resolve(body()) as unknown) as PromiseLike<T>,
  stepDisplayName: () => noop,
  stepParameter: () => noop,
};

const KEY = "tmsTestRuntime";

export const setGlobalTestRuntime = (r: TestRuntime): void => {
  (globalThis as Record<string, unknown>)[KEY] = () => r;
};

export const getGlobalTestRuntime = (): TestRuntime => {
  const fn = (globalThis as Record<string, unknown>)[KEY] as (() => TestRuntime | undefined) | undefined;
  return fn?.() ?? noopRuntime;
};
