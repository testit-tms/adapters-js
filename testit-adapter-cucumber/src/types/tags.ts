import { Link } from 'testit-api-client';

export type ParsedTags = {
  externalId?: string;
  links: Omit<Link, 'id'>[];
  title?: string;
  workItemId?: string;
  name?: string;
  description?: string;
  labels: string[];
  nameSpace?: string;
  className?: string;
};

export enum TagType {
  ExternalId,
  LinkUrl,
  Link,
  Title,
  WorkItemId,
  Name,
  Description,
  Label,
  NameSpace,
  ClassName,
  Unknown,
}

export const tags: Record<keyof ParsedTags, string> = {
  externalId: 'ExternalId',
  links: 'Link',
  title: 'Title',
  name: 'DisplayName',
  workItemId: 'WorkItemId',
  description: 'Description',
  labels: 'Label',
  nameSpace: 'NameSpace',
  className: 'ClassName'
};
