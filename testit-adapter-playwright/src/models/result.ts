import { TestStatus } from "@playwright/test";
import { TestError, TestStep } from "@playwright/test/reporter";

export interface Result {
  status: TestStatus;
  attachments: Array<ResultAttachment>;
  duration: number;
  error?: TestError;
  errors: Array<TestError>;
  /** Full Playwright step tree (fixtures, hooks, test.step); preferred over reporter cache. */
  steps?: TestStep[];
}

export interface ResultAttachment {
    /**
     * Attachment name.
     */
    name: string;

    /**
     * Content type of this attachment to properly present in the report, for example `'application/json'` or
     * `'image/png'`.
     */
    contentType: string;

    /**
     * Optional path on the filesystem to the attached file.
     */
    path?: string;

    /**
     * Optional attachment body used instead of a file.
     */
    body?: Buffer;
}
