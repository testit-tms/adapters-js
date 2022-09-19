import { LinkModel } from 'testit-api-client';

export type ParsedTags = {
    externalId?: string;
    links: Omit<LinkModel, 'id'>[];
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
    LinkUrl,
    Link,
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
    links: 'Link',
    title: 'Title',
    name: 'DisplayName',
    workItemId: 'WorkItemId',
    workItemIds: 'WorkItemIds',
    description: 'Description',
    label: 'Label',
    labels: 'Labels',
};
