import { CallsiteRecord } from 'callsite-record';

export {};
declare global {
  interface TestController {
    testRun: TestRun;
  }
  interface TestRun {
    test: Test;
  }
  interface Test {
    meta: object;
  }
}

export interface Screenshot {
  screenshotPath?: string;
  thumbnailPath?: string;
  userAgent?: string;
  quarantineAttempt?: number;
  takenOnFail?: boolean;
}

export type TestCafeError = {
  errMsg: string;
  originError?: string;
  callsite?: CallsiteRecord;
};

export interface TestRunInfo {
  errs?: TestCafeError[];
  warnings?: string[];
  durationMs?: number;
  unstable?: boolean;
  screenshotPath?: string;
  screenshots?: Screenshot[];
  quarantine?: object;
  skipped?: boolean;
  testId: string;
}

export interface ErrorObject {
  errMsg?: string;
  callsite?: CallSite;
  userAgent?: string;
}

export interface CallSite extends CallsiteRecord {
  filename?: string;
  lineNum?: string;
}


