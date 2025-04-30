import { TestStatus } from "@playwright/test";
import { TestError } from "@playwright/test/reporter";

export interface Result {
  status: TestStatus;
  attachments: Array<{
    name: string;
    contentType: string;
    path?: string;
    body?: Buffer;
  }>;
  duration: number;
  error?: TestError;
  errors: Array<TestError>;
}
