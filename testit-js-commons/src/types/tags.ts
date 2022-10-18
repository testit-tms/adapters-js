import { Link } from "./link";


export type ParsedTags = {
    externalId?: string;
    /**
     * @deprecated This tag is no longer acceptable to compute time between versions.
     * Use "Links" instead.
    */
    link?: Link;
    links: Link[];
    title?: string;
    /**
     * @deprecated This tag is no longer acceptable to compute time between versions.
     * Use "WorkItemIds" instead.
    */
    workItemId?: string;
    workItemIds?: string[];
    name?: string;
    description?: string;
    /**
     * @deprecated This tag is no longer acceptable to compute time between versions.
     * Use "Labels" instead.
    */
    label?: string,
    labels: string[];
};

export enum TagType {
    ExternalId,
    /**
     * @deprecated This tag is no longer acceptable to compute time between versions.
     * Use "Links" instead.
    */
    LinkUrl,
    LinksUrl,
    /**
     * @deprecated This tag is no longer acceptable to compute time between versions.
     * Use "Links" instead.
    */
    Link,
    Links,
    Title,
    /**
     * @deprecated This tag is no longer acceptable to compute time between versions.
     * Use "WorkItemIds" instead.
    */
    WorkItemId,
    WorkItemIds,
    Name,
    Description,
    /**
     * @deprecated This tag is no longer acceptable to compute time between versions.
     * Use "Labels" instead.
    */
    Label,
    Labels,
    Unknown,
}

export const tags: Record<keyof ParsedTags, string> = {
    externalId: 'ExternalId',
    link: 'Link',
    links: 'Links',
    title: 'Title',
    name: 'DisplayName',
    workItemId: 'WorkItemId',
    workItemIds: 'WorkItemIds',
    description: 'Description',
    label: 'Label',
    labels: 'Labels',
};
