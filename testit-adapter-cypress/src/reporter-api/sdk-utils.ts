import type { StatusDetails } from "./model.js";
import { Status } from "./model.js";
import { Label, Link } from "testit-js-commons";

export const getStatusFromError = (error: Partial<Error>): Status => {
  const name = error.constructor?.name ?? "";
  const msg = error.message ?? "";
  const stack = error.stack ?? "";
  if (/assert/gi.test(name) || /expectation/gi.test(name)) return Status.FAILED;
  if (error.name && /assert/gi.test(error.name)) return Status.FAILED;
  if (msg && /assert/gi.test(msg)) return Status.FAILED;
  if (stack && /@vitest\/expect/gi.test(stack)) return Status.FAILED;
  if (stack && /playwright\/lib\/matchers/gi.test(stack)) return Status.FAILED;
  if ("matcherResult" in error || "actual" in error || "expected" in error) return Status.FAILED;
  return Status.BROKEN;
};

const ansiRe = /[\u001B\u009B][[\]()#;?]*(?:(?:;[-a-zA-Z\d\/#&.:=?%@~_]+)*|[a-zA-Z\d]+(?:;[-\d\/#&.:=?%@~_]*)*)?\u0007/g;
export const stripAnsi = (str: string): string => str.replace(ansiRe, "");

export const getMessageAndTraceFromError = (
  error: Error | { message?: string; stack?: string },
): StatusDetails => {
  const message = error.message ? stripAnsi(error.message) : undefined;
  const trace = error.stack ? stripAnsi(error.stack) : undefined;
  const v = error as Record<string, unknown>;
  const actual = v.actual !== undefined ? serialize(v.actual) : undefined;
  const expected = v.expected !== undefined ? serialize(v.expected) : undefined;
  return { message, trace, actual, expected };
};

export const isPromise = (obj: unknown): obj is PromiseLike<unknown> =>
  !!obj &&
  (typeof obj === "object" || typeof obj === "function") &&
  "then" in (obj as object) &&
  typeof (obj as PromiseLike<unknown>).then === "function";

export type SerializeOptions = { maxDepth?: number; maxLength?: number; replacer?: (key: string, value: unknown) => unknown };

export const serialize = (value: unknown, opts: SerializeOptions = {}): string => {
  const { maxLength = 0 } = opts;
  let s: string;
  if (typeof value === "object" && value !== null) {
    try {
      s = JSON.stringify(value);
    } catch {
      s = String(value);
    }
  } else {
    s = String(value);
  }
  return maxLength && s.length > maxLength ? s.slice(0, maxLength) + "..." : s;
};

const tmsTitleMetadataRegexp = /(?:^|\s)@?testit\.([^:=\s]+)[:=]("([^"]+)"|'([^']+)'|`([^`]+)`|(\S+))/g;

export const extractMetadataFromString = (
  title: string,
): { labels: Label[]; links: Link[]; cleanTitle: string } => {
  const labels: Label[] = [];
  const links: Link[] = [];
  const cleanTitle = title.replaceAll(tmsTitleMetadataRegexp, "").replace(/\s+/g, " ").trim();
  let m: RegExpExecArray | null;
  tmsTitleMetadataRegexp.lastIndex = 0;
  while ((m = tmsTitleMetadataRegexp.exec(title)) !== null) {
    const type = m[1];
    const value = (m[3] ?? m[4] ?? m[5] ?? m[2] ?? "").replace(/^["'`]|["'`]$/g, "");
    if (!type || !value) continue;
    const [subtype, name] = type.split(".");
    if (subtype === "label") labels.push({ name: value });
    else if (subtype === "link") links.push({ title: name, url: value });
  }
  return { labels, links, cleanTitle };
};
