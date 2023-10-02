import { Link } from "testit-js-commons";

declare global {
  const testit: {
    externalId(id: string): void;
    displayName(name: string): void;
    links(links: Link[]): void;
    labels(labels: string[]): void;
    workItemIds(workItemsIds: string[]): void;
    params(params: any): void;
    step(name: string, description?: string): void;
    title(title: string): void;
    description(description: string): void;
    addAttachments(attachment: string, name?: string): void;
    addAttachments(attachments: string[]): void;
    addAttachments(attachments: string[] | string, name?: string): void;
    addLinks(link: Link): void;
    addLinks(links: Link[]): void;
    addMessage(message: string): void;
    namespace(namespace: string): void;
    classname(classname: string): void;
  };
}
