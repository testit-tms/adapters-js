import { Attachment, AutotestPost, AutotestResult, Link, Outcome, Step, Utils } from "testit-js-commons";
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

  private getPickleExternalId(pickle: Pickle): string {
    const tags = parseTags(pickle.tags);
    return tags.externalId ?? Utils.getHash(tags.name ?? pickle.name);
  }

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
    // Envelopes can be replayed/out-of-order; keep pickles unique by id.
    const idx = this.pickles.findIndex((p) => p.id === pickle.id);
    if (idx >= 0) {
      this.pickles[idx] = pickle;
      return;
    }
    this.pickles.push(pickle);
  }
  saveTestCase(testCase: TestCase): void {
    const idx = this.testCases.findIndex((t) => t.id === testCase.id);
    if (idx >= 0) {
      this.testCases[idx] = testCase;
      return;
    }
    this.testCases.push(testCase);
  }
  saveTestCaseStarted(testCaseStarted: TestCaseStarted): void {
    const idx = this.testCasesStarted.findIndex((t) => t.id === testCaseStarted.id);
    if (idx >= 0) {
      this.testCasesStarted[idx] = testCaseStarted;
      return;
    }
    this.testCasesStarted.push(testCaseStarted);
  }
  saveTestCaseFinished(testCaseFinished: TestCaseFinished): void {
    const idx = this.testCasesFinished.findIndex((t) => t.testCaseStartedId === testCaseFinished.testCaseStartedId);
    if (idx >= 0) {
      this.testCasesFinished[idx] = testCaseFinished;
      return;
    }
    this.testCasesFinished.push(testCaseFinished);
  }
  saveTestStepStarted(testStepStarted: TestStepStarted): void {
    const idx = this.testStepsStarted.findIndex((t) => t.testStepId === testStepStarted.testStepId);
    if (idx >= 0) {
      this.testStepsStarted[idx] = testStepStarted;
      return;
    }
    this.testStepsStarted.push(testStepStarted);
  }
  saveTestStepFinished(testStepFinished: TestStepFinished): void {
    const idx = this.testStepsFinished.findIndex((t) => t.testStepId === testStepFinished.testStepId);
    if (idx >= 0) {
      this.testStepsFinished[idx] = testStepFinished;
      return;
    }
    this.testStepsFinished.push(testStepFinished);
  }

  getAutotests(): AutotestPost[] {
    // IMPORTANT: In Scenario Outline mode each example row becomes its own Pickle.
    // Using scenario-level mapping causes externalId collisions and results overwrite each other.
    const featureName = this.gherkinDocuments.find((d) => d.feature)?.feature?.name;
    return this.pickles.map((pickle) => {
      const tags = parseTags(pickle.tags);
      return {
        externalId: this.getPickleExternalId(pickle),
        name: tags.name ?? pickle.name,
        title: tags.title,
        description: tags.description,
        links: tags.links,
        labels: tags.labels?.map((label) => ({ name: label })),
        tags: tags.tags,
        workItemIds: tags.workItemIds,
        namespace: tags.nameSpace,
        classname: tags.className ?? featureName,
        // Pickle steps do not include keywords; keep text only.
        steps: pickle.steps.map((s) => ({ title: s.text })),
        externalKey: pickle.name,
      };
    });
  }

  getTestRunResults(): AutotestResult[] {
    const results: AutotestResult[] = [];

    for (const pickle of this.pickles) {
      const tags = parseTags(pickle.tags);

      const testCase = this.testCases.find((testCase) => testCase.pickleId === pickle.id);

      if (testCase !== undefined) {
        const testCaseStarted = this.testCasesStarted.find((started) => started.testCaseId === testCase.id);
        if (testCaseStarted === undefined) {
          continue;
        }

        const testCaseFinished = this.testCasesFinished.find(
          (finished) => finished.testCaseStartedId === testCaseStarted.id
        );
        if (testCaseFinished === undefined) {
          continue;
        }

        const stepResults = pickle.steps
          .map((step) => this.getStepResult(step, testCase))
          .filter((step): step is Step => step !== undefined);
        if (stepResults.length !== pickle.steps.length) {
          // In realtime mode envelopes can arrive out of order; wait for next pass.
          continue;
        }
        const steps = stepResults
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
          autoTestExternalId: this.getPickleExternalId(pickle),
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

  getStepResult(pickleStep: PickleStep, testCase: TestCase): Step | undefined {
    const testStep = testCase.testSteps.find((step) => step.pickleStepId === pickleStep.id);
    if (testStep === undefined) {
      return undefined;
    }

    const testStepStarted = this.testStepsStarted.find((step) => step.testStepId === testStep.id);
    if (testStepStarted === undefined) {
      return undefined;
    }

    const testStepFinished = this.testStepsFinished.find((step) => step.testStepId === testStepStarted.testStepId);
    if (testStepFinished === undefined) {
      return undefined;
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
      return undefined;
    }
    const testStepStarted = this.testStepsStarted.find((step) => step.testStepId === testStep.id);
    if (testStepStarted === undefined) {
      return undefined;
    }
    const testStepFinished = this.testStepsFinished.find((step) => step.testStepId === testStepStarted.testStepId);
    if (testStepFinished === undefined) {
      return undefined;
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
      this.links[testCaseId].push(...links);
    }
  }

  addAttachments(testCaseId: string, attachments: Attachment[]): void {
    if (this.attachments[testCaseId] === undefined) {
      this.attachments[testCaseId] = attachments;
    } else {
      this.attachments[testCaseId].push(...attachments);
    }
  }
}
