import { Link } from "testit-js-commons";

export type ParsedTags = {
  externalId?: string;
  links: Link[];
  title?: string;
  workItemIds?: string[];
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
  externalId: "ExternalId",
  links: "Links",
  title: "Title",
  name: "DisplayName",
  workItemIds: "WorkItemIds",
  description: "Description",
  labels: "Labels",
  nameSpace: "NameSpace",
  className: "ClassName",
};
