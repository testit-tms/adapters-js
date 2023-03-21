import { LinkPostModel } from 'testit-api-client';

export type StepData = {
  title: string;
  description?: string;
  attachments: string[];
};

export type AutotestData = {
  name: string;
  title?: string;
  description?: string;
  externalId?: string;
  namespace?: string;
  classname?: string;
  attachments: string[];
  beforeEach: StepData[];
  steps: StepData[];
  afterEach: StepData[];
  links: LinkPostModel[];
  runtimeLinks: LinkPostModel[];
  message?: string;
  labels: string[];
  workItems: string[];
  params?: any;
};

export type AutotestResult = {
  startedAt?: number;
  duration?: number;
  finishedAt?: number;
  isFailed: boolean;
  message?: string;
  trace?: string;
};

export interface Config {
  url: string
  privateToken: string,
  projectId: string,
  configurationId: string,
  testRunId?: string,
  testRunName?: string,
  automaticCreationTestCases?: boolean;
  certValidation?: boolean,
  configFile?: string,
  __DEV?: boolean
}

export interface LinkPost {
  title?: string;
  url: string;
  description?: string;
  type?: LinkType;
  hasInfo?: boolean;
}

export type LinkType =
| 'Related'
| 'BlockedBy'
| 'Defect'
| 'Issue'
| 'Requirement'
| 'Repository';
