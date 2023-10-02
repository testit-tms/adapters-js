import { Link } from "testit-js-commons";

export namespace Origin {
  export interface TestConfig {
    title?: string;
    displayName?: string;
    description?: string;
    externalId?: string;
    links: Link[];
    labels?: string[];
    workItemIds?: [];
    classname?: string;
    namespace?: string;
  }

  export interface TestText {
    name: string;
    content: string;
  }

  export interface TestMetadata {
    links?: Link[];
    attachments?: string[];
    message?: string;
    text?: TestText;
  }
}
