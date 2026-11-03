import {
    TestCase,
    TestStep,
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
import {
  getStatusDetails,
  isAfterHook,
  isAllStepsWithPassedOutcome,
  isBeforeHook,
  isFixtureStep,
  isStep,
} from "./utils";
import { Result } from "./models/result";


export enum Status {
  PASSED = "Passed",
  FAILED = "Failed",
  SKIPPED = "Skipped",
}

export type StatusDetails = {
  message?: string;
  trace?: string;
};

export type PlaywrightStepsTree = {
  setup: ShortStep[];
  steps: ShortStep[];
  teardown: ShortStep[];
  setupResults: Step[];
  stepResults: Step[];
  teardownResults: Step[];
};

export class Converter {
    static convertTestCaseToAutotestPost(autotestData: MetadataMessage): AutotestPost {
      return {
        externalId: autotestData.externalId!,
        name: autotestData.displayName!,
        title: autotestData.title,
        description: autotestData.description,
        labels: autotestData.labels,
        layer: autotestData.layer,
        tags: autotestData.tags,
        links: autotestData.links,
        namespace: autotestData.namespace,
        classname: autotestData.classname,
        workItemIds: autotestData.workItemIds,
        externalKey: autotestData.externalKey,
      };
    }

    static convertAutotestPostToAutotestResult(
      autotestData: MetadataMessage,
      test: TestCase,
      result: Result): AutotestResult {
      const autotestResult: AutotestResult = {
        autoTestExternalId: autotestData.externalId!,
        outcome: this.convertStatus(result.status, test.expectedStatus),
        links: autotestData.addLinks,
        duration: result.duration,
        parameters: autotestData.params,
        attachments: autotestData.addAttachments,
      };

      if (result.error) {
        const status = getStatusDetails(result.error);

        autotestResult.message = status.message;
        autotestResult.traces = status.trace;
      }

      if (autotestData.addMessage) {
        autotestResult.message = autotestData.addMessage
      }

      return autotestResult;
    }

    static convertPlaywrightStepsTree(
      rawSteps: TestStep[],
      attachmentsMap: Map<Attachment, TestStep>,
    ): PlaywrightStepsTree {
      const setupRaw: TestStep[] = [];
      const bodyRaw: TestStep[] = [];
      const teardownRaw: TestStep[] = [];

      for (const step of rawSteps) {
        if (isBeforeHook(step)) {
          setupRaw.push(...(step.steps ?? []));
        } else if (isAfterHook(step)) {
          teardownRaw.push(...(step.steps ?? []));
        } else if (isStep(step)) {
          bodyRaw.push(step);
        } else if (step.steps?.length) {
          bodyRaw.push(...this.collectTestSteps(step.steps));
        }
      }

      return {
        setup: this.convertPhaseShortSteps(setupRaw),
        steps: this.convertTestStepsToShortSteps(bodyRaw),
        teardown: this.convertPhaseShortSteps(teardownRaw),
        setupResults: this.convertPhaseSteps(setupRaw, attachmentsMap),
        stepResults: this.convertTestStepsToSteps(bodyRaw, attachmentsMap),
        teardownResults: this.convertPhaseSteps(teardownRaw, attachmentsMap),
      };
    }

    private static collectTestSteps(steps: TestStep[]): TestStep[] {
      const out: TestStep[] = [];
      for (const step of steps) {
        if (isStep(step)) {
          out.push(step);
        } else if (step.steps?.length) {
          out.push(...this.collectTestSteps(step.steps));
        }
      }
      return out;
    }

    private static convertPhaseSteps(
      steps: TestStep[],
      attachmentsMap: Map<Attachment, TestStep>,
    ): Step[] {
      const out: Step[] = [];
      for (const step of steps) {
        if (isFixtureStep(step)) {
          const nested = this.convertTestStepsToSteps(step.steps ?? [], attachmentsMap);
          if (nested.length === 0) {
            continue;
          }
          out.push({
            title: step.title,
            outcome: step.error || !isAllStepsWithPassedOutcome(nested) ? Status.FAILED : Status.PASSED,
            info: JSON.stringify(step.error),
            steps: nested,
            attachments: [...attachmentsMap.keys()].filter(
              (attachmentId: Attachment) => attachmentsMap.get(attachmentId) === step,
            ),
          });
        } else if (isStep(step)) {
          out.push(this.convertTestStepToStep(step, attachmentsMap));
        } else if (step.steps?.length) {
          out.push(...this.convertPhaseSteps(step.steps, attachmentsMap));
        }
      }
      return out;
    }

    private static convertPhaseShortSteps(steps: TestStep[]): ShortStep[] {
      const out: ShortStep[] = [];
      for (const step of steps) {
        if (isFixtureStep(step)) {
          const nested = this.convertTestStepsToShortSteps(step.steps ?? []);
          if (nested.length === 0) {
            continue;
          }
          out.push({
            title: step.title,
            steps: nested,
          });
        } else if (isStep(step)) {
          out.push(this.convertTestStepToShortStep(step));
        } else if (step.steps?.length) {
          out.push(...this.convertPhaseShortSteps(step.steps));
        }
      }
      return out;
    }

    static convertTestStepsToShortSteps(steps: TestStep[]): ShortStep[] {
      const out: ShortStep[] = [];
      for (const step of steps) {
        if (isStep(step)) {
          out.push(this.convertTestStepToShortStep(step));
        } else if (step.steps?.length) {
          out.push(...this.convertTestStepsToShortSteps(step.steps));
        }
      }
      return out;
    }

    static convertTestStepToShortStep(step: TestStep): ShortStep {
      return {
        title: step.title,
        steps: step.steps.length !== 0 ? this.convertTestStepsToShortSteps(step.steps) : [],
      };
    }

    static convertTestStepsToSteps(steps: TestStep[], attachmentsMap: Map<Attachment, TestStep>): Step[] {
      const out: Step[] = [];
      for (const step of steps) {
        if (isStep(step)) {
          out.push(this.convertTestStepToStep(step, attachmentsMap));
        } else if (step.steps?.length) {
          out.push(...this.convertTestStepsToSteps(step.steps, attachmentsMap));
        }
      }
      return out;
    }

    static convertTestStepToStep(step: TestStep, attachmentsMap: Map<Attachment, TestStep>): Step {
      const steps = step.steps.length !== 0 ? this.convertTestStepsToSteps(step.steps, attachmentsMap) : [];

      return {
        title: step.title,
        outcome: step.error || !isAllStepsWithPassedOutcome(steps) ? Status.FAILED : Status.PASSED,
        info: JSON.stringify(step.error),
        steps: steps,
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
