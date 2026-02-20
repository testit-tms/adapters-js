import { Link, Outcome } from "testit-js-commons";
import { Tag } from "@cucumber/messages";
import { ParsedTags, tags, TagType } from "./types";

export function getTagType(tag: string): TagType {
  if (new RegExp(`^@${tags.externalId}=.+$`).test(tag)) {
    return TagType.ExternalId;
  }
  if (new RegExp(`^@${tags.links}=.+$`).test(tag)) {
    // Check if it is JSON
    if (tag.endsWith("}")) {
      return TagType.Link;
    }
    return TagType.LinkUrl;
  }
  if (new RegExp(`^@${tags.title}=.+$`).test(tag)) {
    return TagType.Title;
  }
  if (new RegExp(`^@${tags.workItemIds}=.+$`).test(tag)) {
    return TagType.WorkItemId;
  }
  if (new RegExp(`^@${tags.name}=.+$`).test(tag)) {
    return TagType.Name;
  }
  if (new RegExp(`^@${tags.description}=.+$`).test(tag)) {
    return TagType.Description;
  }
  if (new RegExp(`^@${tags.labels}=.+$`).test(tag)) {
    return TagType.Label;
  }
  if (new RegExp(`^@${tags.tags}=.+$`).test(tag)) {
    return TagType.Tag;
  }
  if (new RegExp(`^@${tags.nameSpace}=.+$`).test(tag)) {
    return TagType.NameSpace;
  }
  if (new RegExp(`^@${tags.className}=.+$`).test(tag)) {
    return TagType.ClassName;
  }
  return TagType.Unknown;
}

function getExternalId(tag: string): string {
  return parseSpaceInTag(tag.replace(new RegExp(`^@${tags.externalId}=`), ""));
}

function getLinkUrl(tag: string): string {
  return parseSpaceInTag(tag.replace(new RegExp(`^@${tags.links}=`), ""));
}

function getLink(tag: string): Link {
  return JSON.parse(getLinkUrl(tag));
}

function getTitle(tag: string): string {
  return parseSpaceInTag(tag.replace(new RegExp(`^@${tags.title}=`), ""));
}

function getWorkItemId(tag: string): string[] {
  return parseSpaceInTag(tag.replace(new RegExp(`^@${tags.workItemIds}=`), ""))
    .split(",");
}

function getName(tag: string): string {
  return parseSpaceInTag(tag.replace(new RegExp(`^@${tags.name}=`), ""));
}

function getDescription(tag: string): string {
  return parseSpaceInTag(tag.replace(new RegExp(`^@${tags.description}=`), ""));
}

function getLabel(tag: string): string[] {
  return parseSpaceInTag(tag
    .replace(new RegExp(`^@${tags.labels}=`), ""))
    .split(",")
    .map((label) => label.trim());
}

function getTag(tag: string): string[] {
  return parseSpaceInTag(tag
    .replace(new RegExp(`^@${tags.tags}=`), ""))
    .split(",")
    .map((tag) => tag.trim());
}

function getNameSpace(tag: string): string {
  return parseSpaceInTag(tag.replace(new RegExp(`^@${tags.nameSpace}=`), ""));
}

function getClassName(tag: string): string {
  return parseSpaceInTag(tag.replace(new RegExp(`^@${tags.className}=`), ""));
}

export function parseTags(tags: readonly Pick<Tag, "name">[]): ParsedTags {
  const parsedTags: ParsedTags = { links: [], labels: [], tags: [], workItemIds: [] };
  for (const tag of tags) {
    switch (getTagType(tag.name)) {
      case TagType.ExternalId:
        parsedTags.externalId = getExternalId(tag.name);
        continue;
      case TagType.LinkUrl: {
        const url = getLinkUrl(tag.name);
        parsedTags.links?.push({ url, title: url });
        continue;
      }
      case TagType.Link: {
        parsedTags.links?.push(getLink(tag.name));
        continue;
      }
      case TagType.Title: {
        parsedTags.title = getTitle(tag.name);
        continue;
      }
      case TagType.WorkItemId: {
        parsedTags.workItemIds?.push(...getWorkItemId(tag.name));
        continue;
      }
      case TagType.Name: {
        parsedTags.name = getName(tag.name);
        continue;
      }
      case TagType.Description: {
        parsedTags.description = getDescription(tag.name);
        continue;
      }
      case TagType.Label: {
        parsedTags.labels?.push(...getLabel(tag.name));
        continue;
      }
      case TagType.Tag: {
        parsedTags.tags?.push(...getTag(tag.name));
        continue;
      }
      case TagType.NameSpace: {
        parsedTags.nameSpace = getNameSpace(tag.name);
        continue;
      }
      case TagType.ClassName: {
        parsedTags.className = getClassName(tag.name);
        continue;
      }
      case TagType.Unknown:
        continue;
      default:
        throw new Error("Unknown tag type");
    }
  }
  return parsedTags;
}

export function calculateResultOutcome(outcomes: Outcome[]): Outcome {
  if (outcomes.some((outcome) => outcome === "Failed")) {
    return "Failed";
  }
  if (outcomes.some((outcome) => outcome === "Blocked")) {
    return "Blocked";
  }
  if (outcomes.some((outcome) => outcome === "Skipped")) {
    return "Skipped";
  }
  if (outcomes.every((outcome) => outcome === "Passed")) {
    return "Passed";
  }
  throw new Error("Cannot calculate result outcome");
}

function parseSpaceInTag(tag: string): string {
  return tag.replace("\_", " ");
}
