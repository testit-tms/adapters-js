import { Link, LinkType } from "../../common";
import logger from "../../logger";

const LINK_TYPES: ReadonlySet<string> = new Set([
  "Related",
  "BlockedBy",
  "Defect",
  "Issue",
  "Requirement",
  "Repository",
]);

/** Parse CSV or JSON array of tag strings. Empty / invalid → undefined. */
export function parseTestRunTags(raw?: string | string[] | null): string[] | undefined {
  if (raw == null) {
    return undefined;
  }
  if (Array.isArray(raw)) {
    const tags = raw.map((t) => String(t).trim()).filter(Boolean);
    return tags.length ? tags : undefined;
  }
  const text = String(raw).trim();
  if (!text) {
    return undefined;
  }
  if (text.startsWith("[")) {
    try {
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) {
        logger.warn("[config] TMS_TEST_RUN_TAGS JSON must be an array of strings");
        return undefined;
      }
      const tags = parsed.map((t) => String(t).trim()).filter(Boolean);
      return tags.length ? tags : undefined;
    } catch {
      logger.warn("[config] TMS_TEST_RUN_TAGS is invalid JSON");
      return undefined;
    }
  }
  const tags = text.split(",").map((t) => t.trim()).filter(Boolean);
  return tags.length ? tags : undefined;
}

/** Parse JSON array of link objects. Empty / invalid → undefined. */
export function parseTestRunLinks(raw?: string | Link[] | null): Link[] | undefined {
  if (raw == null) {
    return undefined;
  }
  if (Array.isArray(raw)) {
    return normalizeLinks(raw);
  }
  const text = String(raw).trim();
  if (!text) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) {
      logger.warn("[config] TMS_TEST_RUN_LINKS JSON must be an array");
      return undefined;
    }
    return normalizeLinks(parsed);
  } catch {
    logger.warn("[config] TMS_TEST_RUN_LINKS is invalid JSON");
    return undefined;
  }
}

function normalizeLinks(items: unknown[]): Link[] | undefined {
  const links: Link[] = [];
  for (const item of items) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const obj = item as Record<string, unknown>;
    const url = typeof obj.url === "string" ? obj.url.trim() : "";
    if (!url) {
      logger.warn("[config] test run link skipped: empty url");
      continue;
    }
    const typeRaw = typeof obj.type === "string" ? obj.type : undefined;
    const type =
      typeRaw && LINK_TYPES.has(typeRaw) ? (typeRaw as LinkType) : ("Related" as LinkType);
    links.push({
      url,
      title: typeof obj.title === "string" && obj.title.trim() ? obj.title.trim() : url,
      description: typeof obj.description === "string" ? obj.description : undefined,
      type,
    });
  }
  return links.length ? links : undefined;
}

export function mergeTagLists(existing: string[] | undefined, incoming: string[] | undefined): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const tag of [...(existing ?? []), ...(incoming ?? [])]) {
    if (!tag || seen.has(tag)) {
      continue;
    }
    seen.add(tag);
    result.push(tag);
  }
  return result;
}

/** Merge by url (case-sensitive); keep existing link when URL already present. */
export function mergeLinkLists<T extends { url: string }>(
  existing: T[] | undefined,
  incoming: T[] | undefined
): T[] {
  const result: T[] = [...(existing ?? [])];
  const seen = new Set(result.map((l) => l.url));
  for (const link of incoming ?? []) {
    if (!link?.url || seen.has(link.url)) {
      continue;
    }
    seen.add(link.url);
    result.push(link);
  }
  return result;
}
