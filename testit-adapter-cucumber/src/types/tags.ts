import { Link } from 'testit-api-client';

export type ParsedTags = {
  externalId?: string;
  links: Omit<Link, 'id'>[];
  title?: string;
  workItemId?: string;
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
  WorkItemId,
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
  description: 'Description',
  label: 'Label',
  labels: 'Labels',
};
