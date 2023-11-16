import {
    TestCase,
    TestStep,
    TestError,
    TestResult,
} from "@playwright/test/reporter";
import { TestStatus } from "@playwright/test";
import {
    AutotestPost,
    AutotestResult,
    ShortStep,
    Step,
    Attachment
} from "testit-js-commons";
import { MetadataMessage } from "./labels";


enum Status {
  PASSED = "Passed",
  FAILED = "Failed",
  SKIPPED = "Skipped",
}

export class Converter {
    static convertTestCaseToAutotestPost(autotestData: MetadataMessage): AutotestPost {
      return {
        externalId: autotestData.externalId!,
        name: autotestData.displayName!,
        title: autotestData.title,
        description: autotestData.description,
        labels: autotestData.labels,
        links: autotestData.links,
        namespace: autotestData.namespace,
        classname: autotestData.classname,
      };
    }

    static convertAutotestPostToAutotestResult(
      autotestData: MetadataMessage,
      test: TestCase,
      result: TestResult): AutotestResult {
      const autotestResult: AutotestResult = {
        autoTestExternalId: autotestData.externalId!,
        outcome: this.convertStatus(result.status, test.expectedStatus),
        links: autotestData.addLinks,
        duration: result.duration,
        parameters: autotestData.params,
        attachments: autotestData.addAttachments,
        message: autotestData.addMessage,
      };

      if (result.error) {
        const status = getStatusDetails(result.error);

        autotestResult.message = status.message;
        autotestResult.traces = status.trace;
      }

      return autotestResult;
    }

    static convertTestStepsToShortSteps(steps: TestStep[]): ShortStep[] {
      return steps.map(step => {
        return this.convertTestStepToShortStep(step);
      });
    }

    static convertTestStepToShortStep(step: TestStep): ShortStep {
      return {
        title: step.title,
      };
    }

    static convertTestStepsToSteps(steps: TestStep[], attachmentsMap: Map<Attachment, TestStep>): Step[] {
      return steps.map(step => this.convertTestStepToStep(step, attachmentsMap));
    }

    static convertTestStepToStep(step: TestStep, attachmentsMap: Map<Attachment, TestStep>): Step {
      return {
        title: step.title,
        outcome: step.error ? Status.FAILED : Status.PASSED,
        attachments: [...attachmentsMap.keys()].filter((attachmentId: Attachment) => attachmentsMap.get(attachmentId) === step),
      };
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
