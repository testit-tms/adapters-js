import { Label, Link, ShortStep } from "../../common";

export interface IAutotestService {
  createAutotest(autotest: AutotestPost): Promise<void>;
  updateAutotest(autotest: AutotestPost): Promise<void>;
  loadAutotest(autotest: AutotestPost, isPassed: boolean): Promise<void>;
  linkToWorkItems(externalId: string, workItemsIds: Array<string>): Promise<void>;
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
