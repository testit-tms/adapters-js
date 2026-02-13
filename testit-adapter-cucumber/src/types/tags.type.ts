import { Link } from "testit-js-commons";

export type ParsedTags = {
  externalId?: string;
  links: Link[];
  title?: string;
  workItemIds?: string[];
  name?: string;
  description?: string;
  labels: string[];
  tags: string[];
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
  Tag,
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
  tags: "Tags",
  nameSpace: "NameSpace",
  className: "ClassName",
};
