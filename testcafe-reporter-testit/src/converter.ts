import {
    AutotestPost,
    AutotestResult,
} from "testit-js-commons";
import Metadata from "./metadata";
import { ErrorObject, TestRunInfo } from "./types";
import addNewLine from "./utils";


enum Status {
  PASSED = "Passed",
  FAILED = "Failed",
  SKIPPED = "Skipped",
}

export class Converter {
    static convertTestCaseToAutotestPost(autotestData: Metadata): AutotestPost {
      return {
        externalId: autotestData.externalId!,
        name: autotestData.displayName!,
        title: autotestData.title,
        description: autotestData.description,
        labels: autotestData.labels?.map((label) => ({ name: label })),
        tags: autotestData.tags,
        links: autotestData.links,
        namespace: autotestData.namespace,
        classname: autotestData.classname,
        workItemIds: autotestData.workItemIds,
      };
    }

    static convertAutotestPostToAutotestResult(
      autotestData: Metadata,
      testRunInfo: TestRunInfo): AutotestResult {
      const autotestResult: AutotestResult = {
        autoTestExternalId: autotestData.externalId!,
        outcome: this.convertStatus(testRunInfo),
        duration: testRunInfo.durationMs ?? 0,
      };

      if (!!testRunInfo.errs && !!testRunInfo.errs.length) {
        const status = getStatusDetails(testRunInfo);

        autotestResult.message = status.message;
        autotestResult.traces = status.trace;
      }

      return autotestResult;
    }

    static convertStatus(testRunInfo: TestRunInfo): Status {
      const hasErrors = !!testRunInfo.errs && !!testRunInfo.errs.length;
      const isSkipped = testRunInfo.skipped;

      if (isSkipped) {
        return Status.SKIPPED;
      }
      if (hasErrors) {
        return Status.FAILED;
      }
      return Status.PASSED;
    };
}

export type StatusDetails = {
  message?: string;
  trace?: string;
};

const getStatusDetails = (testRunInfo: TestRunInfo): StatusDetails => {
  const mergedErrors = mergeErrors(testRunInfo.errs);
  let testMessages: string = '';
  let testDetails: string = '';

  mergedErrors.forEach((error: ErrorObject) => {
    if (error.errMsg) {
      testMessages = addNewLine(testMessages, error.errMsg);
    }

    const callSite = error.callsite;
    let stacktrace: string = 'NO_STACKTRACE_DATA_FOUND';

    if (callSite) {
      if (callSite.filename) {
        testDetails = addNewLine(testDetails, `File name: ${callSite.filename}`);
      }
      if (callSite.lineNum) {
        testDetails = addNewLine(testDetails, `Line number: ${callSite.lineNum}`);
      }
      try {
        const noColorRenderer = require('callsite-record').renderers.noColor;
        stacktrace = error.callsite.renderSync({
          renderer: noColorRenderer,
        });
        testDetails = addNewLine(testDetails, `Stacktrace:\n${stacktrace}`);
      } catch (err) {
        console.error(`Error in callsite.renderSync in reporting:\n${err}`);
      }
    }
    if (error.userAgent) {
      testDetails = addNewLine(testDetails, `User Agent(s): ${error.userAgent}`);
    }
  });

  return {
    message: testMessages,
    trace: testDetails,
  };
};

const mergeErrors = (errors: ErrorObject[]): ErrorObject[] => {
  const mergedErrors: ErrorObject[] = [];
  errors.forEach((error) => {
    if (error && error.errMsg) {
      let errorExists: boolean = false;
      mergedErrors.forEach((mergedError) => {
        if (error.errMsg === mergedError.errMsg) {
          errorExists = true;
          if (error.userAgent && mergedError.userAgent !== error.userAgent) {
            mergedError.userAgent = `${mergedError.userAgent}, ${error.userAgent}`;
          }
        }
      });
      if (!errorExists) {
        mergedErrors.push(error);
      }
    }
  });
  return mergedErrors;
};

export const stripAscii = (str: string): string => {
  return str.replace(asciiRegex, "");
};

const asciiRegex = new RegExp(
  "[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:[a-zA-Z\\d]*(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)|(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~]))",
  "g",
);
