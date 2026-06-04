import path from "path";
import { Utils } from "testit-js-commons";
import type { MetadataMessage } from "./labels";

const STORE_KEY = Symbol.for("testit.playwright.metadata");

function metadataMap(): Map<string, MetadataMessage> {
  const g = globalThis as typeof globalThis & { [STORE_KEY]?: Map<string, MetadataMessage> };
  if (!g[STORE_KEY]) {
    g[STORE_KEY] = new Map();
  }
  return g[STORE_KEY];
}

export function metadataKey(file: string, titlePath: string[]): string {
  return `${path.resolve(file)}\0${titlePath.join("\0")}`;
}

export type MetadataRunContext = {
  testId: string;
  file: string;
  titlePath: string[];
  title: string;
};

export function metadataKeys(ctx: MetadataRunContext): string[] {
  const fullTitle = ctx.titlePath.join(" › ");
  return [
    ctx.testId,
    metadataKey(ctx.file, ctx.titlePath),
    metadataKey(ctx.file, [ctx.title]),
    `hash:${Utils.getHash(ctx.title)}`,
    `hash:${Utils.getHash(fullTitle)}`,
  ];
}

/** In-process metadata from testit.*(); attachments alone are unreliable in the reporter. */
export function patchTestMetadataForRun(ctx: MetadataRunContext, patch: MetadataMessage): void {
  for (const key of metadataKeys(ctx)) {
    const map = metadataMap();
    map.set(key, { ...(map.get(key) ?? {}), ...patch });
  }
}

function peekTestMetadata(key: string): MetadataMessage | undefined {
  return metadataMap().get(key);
}

export function resolveTestMetadata(ctx: {
  testId: string;
  file: string;
  titlePath: string[];
  title: string;
}): MetadataMessage | undefined {
  let merged: MetadataMessage = {};
  let found = false;
  for (const key of metadataKeys(ctx)) {
    const chunk = peekTestMetadata(key);
    if (!chunk) {
      continue;
    }
    merged = { ...merged, ...chunk };
    found = true;
  }
  return found ? merged : undefined;
}

export function releaseTestMetadata(ctx: {
  testId: string;
  file: string;
  titlePath: string[];
  title: string;
}): void {
  const map = metadataMap();
  for (const key of metadataKeys(ctx)) {
    map.delete(key);
  }
}

export function applyMetadataTo(target: MetadataMessage, source: MetadataMessage): void {
  if (source.externalId) {
    target.externalId = source.externalId;
  }
  if (source.displayName) {
    target.displayName = source.displayName;
  }
  if (source.title) {
    target.title = source.title;
  }
  if (source.description) {
    target.description = source.description;
  }
  if (source.labels) {
    target.labels = source.labels;
  }
  if (source.tags) {
    target.tags = source.tags;
  }
  if (source.links) {
    target.links = source.links;
  }
  if (source.namespace) {
    target.namespace = source.namespace;
  }
  if (source.classname) {
    target.classname = source.classname;
  }
  if (source.addLinks) {
    target.addLinks = source.addLinks;
  }
  if (source.addMessage) {
    target.addMessage = source.addMessage;
  }
  if (source.params) {
    target.params = source.params;
  }
  if (source.workItemIds) {
    target.workItemIds = source.workItemIds;
  }
  if (source.externalKey) {
    target.externalKey = source.externalKey;
  }
}
