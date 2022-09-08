import { Link } from 'testit-api-client';

export type ParsedTags = {
  externalId?: string;
  links: Omit<Link, 'id'>[];
  title?: string;
  /**
   * @deprecated The tag "WorkItemId" should not be used
  */
  workItemId?: string;
  workItemIds?: string[];
  name?: string;
  description?: string;
  labels: string[];
};

export enum TagType {
  ExternalId,
  LinkUrl,
  Link,
  Title,
  /**
   * @deprecated The tag "WorkItemId" should not be used
  */
  WorkItemId,
  WorkItemIds,
  Name,
  Description,
  Label,
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
  labels: 'Label',
};
