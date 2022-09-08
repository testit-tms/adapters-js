import { Link } from 'testit-api-client';

export type ParsedTags = {
  externalId?: string;
  links: Omit<Link, 'id'>[];
  title?: string;
  workItemId?: string;
  name?: string;
  description?: string;
  /**
   * @deprecated The tag "WorkItemId" should not be used
  */
  label?: string,
  labels: string[];
};

export enum TagType {
  ExternalId,
  LinkUrl,
  Link,
  Title,
  WorkItemId,
  Name,
  Description,
  /**
   * @deprecated The tag "WorkItemId" should not be used
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
  description: 'Description',
  label: 'Label',
  labels: 'Labels',
};
