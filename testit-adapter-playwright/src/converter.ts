import {
    TestCase,
    TestError,
    TestResult,
} from "@playwright/test/reporter";
import { TestStatus } from "@playwright/test";
import {
    AutotestPost,
    AutotestResult,
    Utils
} from "testit-js-commons";
import { MetadataMessage } from "./labels";


enum Status {
  PASSED = "Passed",
  FAILED = "Failed",
  SKIPPED = "Skipped",
}

export class Converter {
    static convertTestCaseToAutotestPost(
        test: TestCase,
        result: TestResult
    ): AutotestPost {
      const tmsTest: AutotestPost = {
        externalId: Utils.getHash(test.title),
        name: test.title,
      };
    
      for (const attachment of result.attachments) {
        if (!attachment.body && !attachment.path) {
          continue;
        }
    
        if (attachment.contentType === "application/vnd.tms.metadata+json") {
          if (!attachment.body) {
            continue;
          }

          const metadata: MetadataMessage = JSON.parse(attachment.body.toString());

          if (metadata.externalId) {
            tmsTest.externalId = metadata.externalId;
          }

          if (metadata.displayName) {
            tmsTest.name = metadata.displayName;
          }

          if (metadata.title) {
            tmsTest.title = metadata.title;
          }

          if (metadata.description) {
            tmsTest.description = metadata.description;
          }

          if (metadata.labels) {
            tmsTest.labels = metadata.labels;
          }

          if (metadata.links) {
            tmsTest.links = metadata.links;
          }

          if (metadata.namespace) {
            tmsTest.namespace = metadata.namespace;
          }

          if (metadata.classname) {
            tmsTest.classname = metadata.classname;
          }
        }
      }

      return tmsTest;
    }

    static convertAutotestPostToAutotestResult(
      autotestPost: AutotestPost,
      test: TestCase,
      result: TestResult): AutotestResult {
      const autotestResult: AutotestResult = {
        autoTestExternalId: autotestPost.externalId,
        outcome: this.convertStatus(result.status, test.expectedStatus),
        links: autotestPost.links,
        duration: result.duration,
      };

      if (result.error) {
        const status = getStatusDetails(result.error);

        autotestResult.message = status.message;
        autotestResult.traces = status.trace;
      }

      return autotestResult;
    }

    static convertStatus(status: TestStatus, expectedStatus: TestStatus): Status {
      if (status === "skipped") {
        return Status.SKIPPED;
      }
      if (status === expectedStatus) {
        return Status.PASSED;
      }
      return Status.FAILED;
    };
}

export type StatusDetails = {
  message?: string;
  trace?: string;
};

const getStatusDetails = (error: TestError): StatusDetails => {
  const message = error.message && stripAscii(error.message);
  let trace = error.stack && stripAscii(error.stack);
  if (trace && message && trace.startsWith(`Error: ${message}`)) {
    trace = trace.substr(message.length + "Error: ".length);
  }
  return {
    message: message,
    trace: trace,
  };
};

export const stripAscii = (str: string): string => {
  return str.replace(asciiRegex, "");
};

const asciiRegex = new RegExp(
  "[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:[a-zA-Z\\d]*(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)|(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~]))",
  "g",
);
