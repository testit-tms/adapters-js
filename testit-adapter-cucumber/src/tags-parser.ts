import { Tag } from '@cucumber/messages';
import { Link } from 'testit-js-commons';
import { ParsedTags, tags, TagType } from './types/tags';

export function getTagType(tag: string): TagType {
    if (new RegExp(`^@${tags.externalId}=.+$`).test(tag)) {
        return TagType.ExternalId;
    }
    if (new RegExp(`^@${tags.link}=.+$`).test(tag)) {
        // Check if it is JSON
        if (tag.endsWith('}')) {
            return TagType.Link;
        }
        return TagType.LinkUrl;
    }
    if (new RegExp(`^@${tags.links}=.+$`).test(tag)) {
        // Check if it is JSON
        if (tag.endsWith('}')) {
            return TagType.Links;
        }
        return TagType.LinksUrl;
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
    return tag.replace(new RegExp(`^@${tags.link}=`), '');
}

export function getLinksUrl(tag: string): string[] {
    return tag.replace(new RegExp(`^@${tags.links}=`), '').split(',');
}

export function getLink(tag: string): Link {
    const linkData: Link = JSON.parse(getLinkUrl(tag));
    return linkData;
}

export function getLinks(tag: string): Link[] {
    const linkData: Link[] = [];

    for (const link of getLinksUrl(tag)) {
        linkData.push(JSON.parse(link));
    }

    return linkData;
}

export function getTitle(tag: string): string {
    return tag.replace(new RegExp(`^@${tags.title}=`), '');
}

export function getWorkItemIds(tag: string): string[] {
    const reg = getRegForWorkItemTag(tag);

    return tag.replace(reg, '').split(',');
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

export function getLabels(tag: string): string[] {
    const reg = getRegForLabelsTag(tag);

    return tag.replace(reg, '').split(',');
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
            case TagType.LinksUrl: {
                for (const linkUrl of getLinksUrl(tag.name)) {
                    parsedTags.links?.push({
                        url: linkUrl,
                        type: undefined,
                        title: undefined,
                        description: undefined,
                        hasInfo: undefined
                    });
                }
                continue;
            }
            case TagType.Link: {
                parsedTags.links?.push(getLink(tag.name));
                continue;
            }
            case TagType.Links: {
                parsedTags.links?.concat(getLinks(tag.name));
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
