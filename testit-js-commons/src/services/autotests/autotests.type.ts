import { WorkItemIdentifierModel } from "testit-api-client";
import { Label, Link, ShortStep } from "../../common";

export type Status = "Passed" | "Failed" | "Skipped";

export interface IAutotestService {
  createAutotest(autotest: AutotestPost): Promise<void>;
  updateAutotest(autotest: AutotestPost): Promise<void>;
  loadAutotest(autotest: AutotestPost, status: Status): Promise<void>;
  linkToWorkItems(internalId: string, workItemIds: Array<string>): Promise<void>;
  unlinkToWorkItem(internalId: string, workItemId: string): Promise<void>;
  getWorkItemsLinkedToAutoTest(internalId: string): Promise<Array<WorkItemIdentifierModel>>;
  getAutotestByExternalId(externalId: string): Promise<AutotestGet | null>;
}

interface AutotestBase {
  externalId?: string;
  name?: string;
  links?: Array<Link>;
  namespace?: string;
  classname?: string;
  steps?: Array<ShortStep>;
  setup?: Array<ShortStep>;
  teardown?: Array<ShortStep>;
  labels?: Array<Label>;
  externalKey?: string;
}

export interface AutotestPost extends AutotestBase {
  externalId: string;
  name: string;
  title?: string;
  description?: string;
  shouldCreateWorkItem?: boolean;
  workItemIds?: Array<string>;
  isFlaky?: boolean;
}

export interface AutotestGet extends AutotestBase {
  id?: string;
  projectId?: string;
  globalId?: number;
}
