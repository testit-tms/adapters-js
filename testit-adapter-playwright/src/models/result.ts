import { TestStatus } from "@playwright/test";
import { TestError } from "@playwright/test/reporter";

export interface Result {
  status: TestStatus;
  attachments: Array<ResultAttachment>;
  duration: number;
  error?: TestError;
  errors: Array<TestError>;
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
