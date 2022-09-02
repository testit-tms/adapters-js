import { Tag } from '@cucumber/messages';
import { Link, OutcomeType, TestResultGet, TestRunGet } from 'testit-api-client';
import { ParsedTags, tags, TagType } from './types/tags';

export function getTagType(tag: string): TagType {
  if (new RegExp(`^@${tags.externalId}=.+$`).test(tag)) {
    return TagType.ExternalId;
  }
  if (new RegExp(`^@${tags.links}=.+$`).test(tag)) {
    // Check if it is JSON
    if (tag.endsWith('}')) {
      return TagType.Link;
    }
    return TagType.LinkUrl;
  }
  if (new RegExp(`^@${tags.title}=.+$`).test(tag)) {
    return TagType.Title;
  }
  if (new RegExp(`^@${tags.workItemId}=.+$`).test(tag)) {
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
  return TagType.Unknown;
}

export function getExternalId(tag: string): string {
  return tag.replace(new RegExp(`^@${tags.externalId}=`), '');
}

export function getLinkUrl(tag: string): string {
  return tag.replace(new RegExp(`^@${tags.links}=`), '');
}

export function getLink(tag: string): Omit<Link, 'id'> {
  const linkData: Omit<Link, 'id'> = JSON.parse(getLinkUrl(tag));
  return linkData;
}

export function getTitle(tag: string): string {
  return tag.replace(new RegExp(`^@${tags.title}=`), '');
}

export function getWorkItemId(tag: string): string {
  return tag.replace(new RegExp(`^@${tags.workItemId}=`), '');
}

export function getName(tag: string): string {
  return tag.replace(new RegExp(`^@${tags.name}=`), '');
}

export function getDescription(tag: string): string {
  return tag.replace(new RegExp(`^@${tags.description}=`), '');
}

export function getLabel(tag: string): string {
  return tag.replace(new RegExp(`^@${tags.labels}=`), '');
}

export function parseTags(tags: readonly Pick<Tag, 'name'>[]): ParsedTags {
  const parsedTags: ParsedTags = { links: [], labels: [] };
  for (const tag of tags) {
    switch (getTagType(tag.name)) {
      case TagType.ExternalId:
        parsedTags.externalId = getExternalId(tag.name);
        continue;
      case TagType.LinkUrl: {
        parsedTags.links?.push({ url: getLinkUrl(tag.name) });
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
        parsedTags.workItemId = getWorkItemId(tag.name);
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
        parsedTags.labels?.push(getLabel(tag.name));
        continue;
      }
      case TagType.Unknown:
        continue;
      default:
        throw new Error('Unknown tag type');
    }
  }
  return parsedTags;
}

export function calculateResultOutcome(
  outcomes: (OutcomeType | undefined)[]
): OutcomeType {
  if (outcomes.some((outcome) => outcome === 'Failed')) {
    return 'Failed';
  }
  if (outcomes.some((outcome) => outcome === 'Blocked')) {
    return 'Blocked';
  }
  if (outcomes.some((outcome) => outcome === 'Skipped')) {
    return 'Skipped';
  }
  if (outcomes.every((outcome) => outcome === 'Passed')) {
    return 'Passed';
  }
  throw new Error('Cannot calculate result outcome');
}

export function parsedAutotests(
    autotests: Array<TestResultGet>,
    configurationId: string
): Array<string | undefined> {
  var resolvedAutotests = [];
  for (const autotest of autotests) {
    if (configurationId === autotest.configurationId) {
      resolvedAutotests.push(autotest.autoTest!.externalId);
    }
  }
  return resolvedAutotests;
}