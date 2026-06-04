import path from "path";
import type { MetadataMessage } from "./labels";

const STORE_KEY = Symbol.for("testit.playwright.metadata");

function metadataMap(): Map<string, MetadataMessage> {
  const g = globalThis as typeof globalThis & { [STORE_KEY]?: Map<string, MetadataMessage> };
  if (!g[STORE_KEY]) {
    g[STORE_KEY] = new Map();
  }
  return g[STORE_KEY];
}

export function metadataKey(file: string, title: string): string {
  return `${path.resolve(file)}\0${title}`;
}

/** In-process metadata from testit.*(); attachments alone are unreliable in the reporter. */
export function patchTestMetadata(key: string, patch: MetadataMessage): void {
  const map = metadataMap();
  map.set(key, { ...(map.get(key) ?? {}), ...patch });
}

export function consumeTestMetadata(key: string): MetadataMessage | undefined {
  const map = metadataMap();
  const data = map.get(key);
  if (!data) {
    return undefined;
  }
  map.delete(key);
  return data;
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
