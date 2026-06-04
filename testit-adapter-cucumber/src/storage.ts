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
import { formatPickleStepTitle, mapDate, mapPickleToAutotestPost, resolvePickleExternalId } from "./mappers";
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

  resolvePickleExternalId(pickle: Pickle): string {
    return resolvePickleExternalId(this.gherkinDocuments, pickle);
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
    if (document.uri === undefined) {
      this.gherkinDocuments.push(document);
      return;
    }
    const uri = document.uri.replace(/\\/g, "/");
    const idx = this.gherkinDocuments.findIndex(
      (d) => d.uri !== undefined && d.uri.replace(/\\/g, "/") === uri,
    );
    if (idx >= 0) {
      this.gherkinDocuments[idx] = document;
      return;
    }
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
    return this.pickles.map((pickle) =>
      mapPickleToAutotestPost(this.gherkinDocuments, pickle, (step) => this.formatStepTitle(step)),
    );
  }

  getTestRunResults(): AutotestResult[] {
    return this.testCasesFinished
      .map((finished) => this.buildRealtimePayload(finished.testCaseStartedId)?.result)
      .filter((result): result is AutotestResult => result !== undefined);
  }

  getRealtimePayload(
    testCaseStartedId: string,
  ): { autotest: AutotestPost; result: AutotestResult } | undefined {
    return this.buildRealtimePayload(testCaseStartedId);
  }

  listCatchUpRealtimePayloads(
    sentTestCaseStartedIds: ReadonlySet<string>,
  ): Array<{ testCaseStartedId: string; autotest: AutotestPost; result: AutotestResult }> {
    const payloads: Array<{ testCaseStartedId: string; autotest: AutotestPost; result: AutotestResult }> = [];
    for (const finished of this.testCasesFinished) {
      if (sentTestCaseStartedIds.has(finished.testCaseStartedId)) {
        continue;
      }
      const payload = this.buildRealtimePayload(finished.testCaseStartedId);
      if (payload !== undefined) {
        payloads.push({ testCaseStartedId: finished.testCaseStartedId, ...payload });
      }
    }
    return payloads;
  }

  private buildRealtimePayload(
    testCaseStartedId: string,
  ): { autotest: AutotestPost; result: AutotestResult } | undefined {
    const testCaseStarted = this.testCasesStarted.find((started) => started.id === testCaseStartedId);
    if (testCaseStarted === undefined) {
      return undefined;
    }

    const testCaseFinished = this.testCasesFinished.find(
      (finished) => finished.testCaseStartedId === testCaseStartedId,
    );
    if (testCaseFinished === undefined) {
      return undefined;
    }

    const testCase = this.testCases.find((tc) => tc.id === testCaseStarted.testCaseId);
    if (testCase === undefined) {
      return undefined;
    }

    const pickle = this.pickles.find((p) => p.id === testCase.pickleId);
    if (pickle === undefined) {
      return undefined;
    }

    const tags = parseTags(pickle.tags);
    const stepResults = pickle.steps
      .map((step) => this.getStepResult(step, testCase))
      .filter((step): step is Step => step !== undefined);
    if (stepResults.length !== pickle.steps.length) {
      return undefined;
    }

    const steps = stepResults.filter((item, i, arr) => {
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

    const links = [...(this.links[testCase.id] ?? []), ...(tags.links ?? [])];

    const result: AutotestResult = {
      autoTestExternalId: resolvePickleExternalId(this.gherkinDocuments, pickle),
      links,
      stepResults: steps,
      outcome: calculateResultOutcome(
        steps.map((step) => step.outcome).filter((outcome): outcome is Outcome => outcome !== undefined),
      ),
      startedOn: mapDate(testCaseStarted.timestamp.seconds),
      completedOn: mapDate(testCaseFinished.timestamp.seconds),
      duration: testCaseFinished.timestamp.seconds - testCaseStarted.timestamp.seconds,
      message: this.messages[testCase.id]?.join("\n"),
      traces: messages.join("\n"),
      attachments: this.attachments[testCase.id],
    };

    const autotest = mapPickleToAutotestPost(this.gherkinDocuments, pickle, (step) => this.formatStepTitle(step));

    return { autotest, result };
  }

  private formatStepTitle(pickleStep: PickleStep): string {
    return formatPickleStepTitle(this.gherkinDocuments, pickleStep);
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
      title: this.formatStepTitle(pickleStep),
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
