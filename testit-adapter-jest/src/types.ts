import { LinkPost } from 'testit-api-client';

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
  links: LinkPost[];
  runtimeLinks: LinkPost[];
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
