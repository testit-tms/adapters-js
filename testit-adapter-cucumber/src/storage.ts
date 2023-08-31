import { Attachment, AutotestPost, AutotestResult, Link, Outcome, Step } from "testit-js-commons";
import {
  GherkinDocument,
  Pickle,
  PickleStep,
  TestCase,
  TestCaseFinished,
  TestCaseStarted,
  TestStepFinished,
  TestStepStarted,
} from "@cucumber/messages";
import { IStorage } from "./types";
import { mapDate, mapDocument } from "./mappers";
import { calculateResultOutcome, parseTags } from "./utils";

type TestCaseId = string;

export class Storage implements IStorage {
  private gherkinDocuments: GherkinDocument[] = [];
  private pickles: Pickle[] = [];
  private testCases: TestCase[] = [];
  private testCasesStarted: TestCaseStarted[] = [];
  private testCasesFinished: TestCaseFinished[] = [];
  private testStepsStarted: TestStepStarted[] = [];
  private testStepsFinished: TestStepFinished[] = [];

  private messages: Record<TestCaseId, string[]> = {};
  private links: Record<TestCaseId, Link[]> = {};
  private attachments: Record<TestCaseId, Attachment[]> = {};

  isResolvedTestCase(testCase: TestCase): boolean {
    for (const pickle of this.pickles) {
      const tags = parseTags(pickle.tags);
      if (tags.externalId !== undefined && testCase.pickleId === pickle.id) {
        return true;
      }
    }
    return false;
  }

  saveGherkinDocument(document: GherkinDocument): void {
    this.gherkinDocuments.push(document);
  }
  savePickle(pickle: Pickle): void {
    this.pickles.push(pickle);
  }
  saveTestCase(testCase: TestCase): void {
    this.testCases.push(testCase);
  }
  saveTestCaseStarted(testCaseStarted: TestCaseStarted): void {
    this.testCasesStarted.push(testCaseStarted);
  }
  saveTestCaseFinished(testCaseFinished: TestCaseFinished): void {
    this.testCasesFinished.push(testCaseFinished);
  }
  saveTestStepStarted(testStepStarted: TestStepStarted): void {
    this.testStepsStarted.push(testStepStarted);
  }
  saveTestStepFinished(testStepFinished: TestStepFinished): void {
    this.testStepsFinished.push(testStepFinished);
  }

  getAutotests(): AutotestPost[] {
    return this.gherkinDocuments.flatMap((document) => mapDocument(document));
  }

  getTestRunResults(): AutotestResult[] {
    const results: AutotestResult[] = [];

    for (const pickle of this.pickles) {
      const tags = parseTags(pickle.tags);

      const testCase = this.testCases.find((testCase) => testCase.pickleId === pickle.id);

      if (testCase !== undefined && tags.externalId !== undefined) {
        const testCaseStarted = this.testCasesStarted.find((testCase) => testCase.id === testCase.id);
        if (testCaseStarted === undefined) {
          throw new Error("TestCaseStarted not found");
        }

        const testCaseFinished = this.testCasesFinished.find(
          (testCase) => testCase.testCaseStartedId === testCaseStarted.id
        );
        if (testCaseFinished === undefined) {
          throw new Error("TestCaseFinished not found");
        }

        const steps = pickle.steps
          .map((step) => this.getStepResult(step, testCase))
          .filter((item, i, arr) => {
            const prevOutcome = arr[i - 1]?.outcome;

            return !(
              item.outcome === "Skipped" &&
              prevOutcome !== undefined &&
              ["Failed", "Skipped"].includes(prevOutcome)
            );
          });

        const messages: string[] = [];

        for (const step of pickle.steps) {
          const message = this.getStepMessage(step, testCase);
          if (message !== undefined) {
            messages.push(message);
          }
        }

        const links = this.links[testCase.id] ?? [];
        links.push(...tags.links);

        const result: AutotestResult = {
          autoTestExternalId: tags.externalId,
          links,
          stepResults: steps,
          outcome: calculateResultOutcome(
            steps.map((step) => step.outcome).filter((outcome): outcome is Outcome => outcome !== undefined)
          ),
          startedOn: mapDate(testCaseStarted.timestamp.seconds),
          completedOn: mapDate(testCaseFinished.timestamp.seconds),
          duration: testCaseFinished.timestamp.seconds - testCaseStarted.timestamp.seconds,
          message: this.messages[testCase.id]?.join("\n"),
          traces: messages.join("\n"),
          attachments: this.attachments[testCase.id],
        };
        results.push(result);
      }
    }
    return results;
  }

  getStepResult(pickleStep: PickleStep, testCase: TestCase): Step {
    const testStep = testCase.testSteps.find((step) => step.pickleStepId === pickleStep.id);
    if (testStep === undefined) {
      throw new Error("TestCase step not found");
    }

    const testStepStarted = this.testStepsStarted.find((step) => step.testStepId === testStep.id);
    if (testStepStarted === undefined) {
      throw new Error("TestStepStarted not found");
    }

    const testStepFinished = this.testStepsFinished.find((step) => step.testStepId === testStepStarted.testStepId);
    if (testStepFinished === undefined) {
      throw new Error("TestStepFinished not found");
    }

    return {
      title: pickleStep.text,
      startedOn: mapDate(testStepStarted.timestamp.seconds),
      duration: testStepFinished.testStepResult.duration.seconds,
      completedOn: mapDate(testStepFinished.timestamp.seconds),
      outcome: testStepFinished.testStepResult.status === "PASSED" ? "Passed" : "Failed",
    };
  }

  getStepMessage(pickleStep: PickleStep, testCase: TestCase): string | undefined {
    const testStep = testCase.testSteps.find((step) => step.pickleStepId === pickleStep.id);
    if (testStep === undefined) {
      throw new Error("TestCase step not found");
    }
    const testStepStarted = this.testStepsStarted.find((step) => step.testStepId === testStep.id);
    if (testStepStarted === undefined) {
      throw new Error("TestStepStarted not found");
    }
    const testStepFinished = this.testStepsFinished.find((step) => step.testStepId === testStepStarted.testStepId);
    if (testStepFinished === undefined) {
      throw new Error("TestStepFinished not found");
    }
    return testStepFinished.testStepResult.message;
  }

  addMessage(testCaseId: string, message: string): void {
    if (this.messages[testCaseId] === undefined) {
      this.messages[testCaseId] = [message];
    } else {
      this.messages[testCaseId].push(message);
    }
  }

  addLinks(testCaseId: string, links: Link[]): void {
    if (this.links[testCaseId] === undefined) {
      this.links[testCaseId] = links;
    } else {
      this.links[testCaseId].concat(links);
    }
  }

  addAttachments(testCaseId: string, attachments: Attachment[]): void {
    if (this.attachments[testCaseId] === undefined) {
      this.attachments[testCaseId] = attachments;
    } else {
      this.attachments[testCaseId].concat(attachments);
    }
  }
}
