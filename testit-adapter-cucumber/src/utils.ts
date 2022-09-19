import { Tag } from '@cucumber/messages';
import { LinkModel, TestResultV2GetModel } from 'testit-api-client';
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
    if (new RegExp(`^@${tags.workItemIds}=.+$`).test(tag)) {
        return TagType.WorkItemIds;
    }
    if (new RegExp(`^@${tags.name}=.+$`).test(tag)) {
        return TagType.Name;
    }
    if (new RegExp(`^@${tags.description}=.+$`).test(tag)) {
        return TagType.Description;
    }
    if (new RegExp(`^@${tags.label}=.+$`).test(tag)) {
        return TagType.Label;
    }
    if (new RegExp(`^@${tags.labels}=.+$`).test(tag)) {
        return TagType.Labels;
    }
    return TagType.Unknown;
}

export function getExternalId(tag: string): string {
    return tag.replace(new RegExp(`^@${tags.externalId}=`), '');
}

export function getLinkUrl(tag: string): string {
    return tag.replace(new RegExp(`^@${tags.links}=`), '');
}

export function getLink(tag: string): Omit<LinkModel, 'id'> {
    const linkData: Omit<LinkModel, 'id'> = JSON.parse(getLinkUrl(tag));
    return linkData;
}

export function getTitle(tag: string): string {
    return tag.replace(new RegExp(`^@${tags.title}=`), '');
}

export function getWorkItemIds(tag: string | string[]): string[] {
    if (typeof tag === "string") {
        var reg = getRegForWorkItemTag(tag);

        return [tag.replace(reg, '')];
    }

    for (var value of tag) {
        var reg = getRegForWorkItemTag(value);

        value = value.replace(reg, '');
    }

    return tag;
}

export function getRegForWorkItemTag(tag: string): RegExp {
    if (tag.includes(tags.workItemId)) {
        return new RegExp(`^@${tags.workItemId}=`);
    }
    else {
        return new RegExp(`^@${tags.workItemIds}=`);
    }
}

export function getName(tag: string): string {
    return tag.replace(new RegExp(`^@${tags.name}=`), '');
}

export function getDescription(tag: string): string {
    return tag.replace(new RegExp(`^@${tags.description}=`), '');
}

export function getLabels(tag: string | string[]): string[] {
    if (typeof tag === "string") {
        var reg = getRegForLabelsTag(tag);

        return [tag.replace(reg, '')];
    }

    for (var value of tag) {
        var reg = getRegForLabelsTag(value);

        value = value.replace(reg, '');
    }

    return tag;
}

export function getRegForLabelsTag(tag: string): RegExp {
    if (tag.includes(tags.label)) {
        return new RegExp(`^@${tags.label}=`);
    }

    return new RegExp(`^@${tags.labels}=`);
}

export function parseTags(tags: readonly Pick<Tag, 'name'>[]): ParsedTags {
    const parsedTags: ParsedTags = { links: [], labels: [], workItemIds: [] };
    for (const tag of tags) {
        switch (getTagType(tag.name)) {
            case TagType.ExternalId:
                parsedTags.externalId = getExternalId(tag.name);
                continue;
            case TagType.LinkUrl: {
                parsedTags.links?.push({
                    url: getLinkUrl(tag.name),
                    type: undefined,
                    title: undefined,
                    description: undefined,
                    hasInfo: undefined
                });
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
            case TagType.WorkItemId | TagType.WorkItemIds: {
                parsedTags.workItemIds?.concat(getWorkItemIds(tag.name));
            }
            case TagType.Name: {
                parsedTags.name = getName(tag.name);
                continue;
            }
            case TagType.Description: {
                parsedTags.description = getDescription(tag.name);
                continue;
            }
            case TagType.Label | TagType.Labels: {
                parsedTags.labels?.concat(getLabels(tag.name));
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
    outcomes: (string | undefined)[]
): string {
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
    autotests: Array<TestResultV2GetModel>,
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