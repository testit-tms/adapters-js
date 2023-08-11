export type LinkType = "Related" | "BlockedBy" | "Defect" | "Issue" | "Requirement" | "Repository";
export type Outcome = "Passed" | "Failed" | "Blocked" | "Skipped";

export interface Link {
  title: string;
  url: string;
  description?: string;
  type?: LinkType;
  hasInfo?: boolean;
}

export interface Label {
  name: string;
  globalId?: number;
}

export interface Attachment {
  id: string;
}

export interface Step {
  title: string;
  description?: string;
  info?: string;
  startedOn?: Date;
  completedOn?: Date;
  duration?: number;
  outcome?: Outcome;
  steps?: Array<Step>;
  attachments?: Array<Attachment>;
  parameters?: {
    [key: string]: string;
  };
}

export interface ShortStep {
  title: string;
  description?: string;
  steps?: Array<ShortStep>;
}

export interface Metadata {
  externalId?: string;
  displayName?: string;
  title?: string;
  description?: string;
  workItemsIds?: string[];
  links?: Link[];
  labels?: string[];
  classname?: string;
  namespace?: string;
  properties?: {
    [key: string]: string;
  };
  parameters?: {
    [key: string]: string;
  };
  shouldCreateWorkItem?: boolean;
}

export interface DynamicMethods {
  addAttachments(paths: string[]): Promise<Attachment[]>;
  addAttachments(content: string, fileName?: string): Promise<Attachment[]>;

  addLinks(link: Link): void;
  addLinks(links: Link[]): void;

  addMessage(message: string): void;
}
