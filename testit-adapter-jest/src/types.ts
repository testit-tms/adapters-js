import { AutotestPost, Attachment, Step } from "testit-js-commons";

export interface AutotestData extends AutotestPost {
  parameters?: any;
  attachments: Array<Attachment>;
  beforeEach: Step[];
  afterEach: Step[];
  testSteps: Step[];
}

export type Parameters = Record<string, string>;
