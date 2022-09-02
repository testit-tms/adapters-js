import {
  AttachmentPut,
  AttachmentPutModelAutotestStepResults,
  AutotestResultsForTestRun,
  LinkPost,
} from 'testit-api-client';
import {
  GherkinDocument,
  Pickle,
  PickleStep,
  TestCase,
  TestCaseFinished,
  TestCaseStarted,
  TestStepFinished,
  TestStepStarted,
} from '@cucumber/messages';
import { IStorage } from './types/storage';
import {
  AutotestPostWithWorkItemId,
  mapDate,
  mapDocument,
  mapStatus,
} from './mappers';
import { calculateResultOutcome, parseTags } from './utils';

export class Storage implements IStorage {
  private gherkinDocuments: GherkinDocument[] = [];
  private pickles: Pickle[] = [];
  private testCases: TestCase[] = [];
  private testCasesStarted: TestCaseStarted[] = [];
  private testCasesFinished: TestCaseFinished[] = [];
  private testStepsStarted: TestStepStarted[] = [];
  private testStepsFinished: TestStepFinished[] = [];
  private messages: Record<string, string[]> = {};
  private links: Record<string, LinkPost[]> = {};
  private attachments: Record<string, string[]> = {};

  saveGherkinDocument(document: GherkinDocument): void {
    this.gherkinDocuments.push(document);
  }
  getAutotests(projectId: string): AutotestPostWithWorkItemId[] {
    return this.gherkinDocuments.flatMap((document) =>
      mapDocument(document, projectId)
    );
  }
  savePickle(pickle: Pickle): void {
    this.pickles.push(pickle);
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
  getTestRunResults(configurationId: string): AutotestResultsForTestRun[] {
    const results: AutotestResultsForTestRun[] = [];
    for (const pickle of this.pickles) {
      const testCase = this.testCases.find(
        (testCase) => testCase.pickleId === pickle.id
      );
      const tags = parseTags(pickle.tags);
      if (testCase !== undefined && tags.externalId !== undefined) {
        const testCaseStarted = this.testCasesStarted.find(
          (testCase) => testCase.id === testCase.id
        );
        if (testCaseStarted === undefined) {
          throw new Error('TestCaseStarted not found');
        }
        const testCaseFinished = this.testCasesFinished.find(
          (testCase) => testCase.testCaseStartedId === testCaseStarted.id
        );
        if (testCaseFinished === undefined) {
          throw new Error('TestCaseFinished not found');
        }
        const steps = pickle.steps
          .map((step) => this.getStepResult(step, testCase))
          .filter((item, i, arr) => {
            const prevOutcome = arr[i - 1]?.outcome;
            if (
              item.outcome === 'Skipped' &&
              prevOutcome !== undefined &&
              ['Failed', 'Skipped'].includes(prevOutcome)
            ) {
              return false;
            }
            return true;
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
        const result: AutotestResultsForTestRun = {
          autotestExternalId: tags.externalId,
          configurationId,
          links,
          stepResults: steps,
          outcome: calculateResultOutcome(steps.map((step) => step.outcome)),
          startedOn: mapDate(testCaseStarted.timestamp.seconds),
          completeOn: mapDate(testCaseFinished.timestamp.seconds),
          duration:
            testCaseFinished.timestamp.seconds -
            testCaseStarted.timestamp.seconds,
          message: this.messages[testCase.id]?.join('\n\n') ?? undefined,
          traces: messages.join('\n\n'),
          attachments: this.getAttachments(testCase.id),
        };
        results.push(result);
      }
    }

    return results;
  }
  getStepResult(
    pickleStep: PickleStep,
    testCase: TestCase
  ): AttachmentPutModelAutotestStepResults {
    const testStep = testCase.testSteps.find(
      (step) => step.pickleStepId === pickleStep.id
    );
    if (testStep === undefined) {
      throw new Error('TestCase step not found');
    }
    const testStepStarted = this.testStepsStarted.find(
      (step) => step.testStepId === testStep.id
    );
    if (testStepStarted === undefined) {
      throw new Error('TestStepStarted not found');
    }
    const testStepFinished = this.testStepsFinished.find(
      (step) => step.testStepId === testStepStarted.testStepId
    );
    if (testStepFinished === undefined) {
      throw new Error('TestStepFinished not found');
    }
    return {
      title: pickleStep.text,
      startedOn: mapDate(testStepStarted.timestamp.seconds),
      duration: testStepFinished.testStepResult.duration.seconds,
      completedOn: mapDate(testStepFinished.timestamp.seconds),
      outcome: mapStatus(testStepFinished.testStepResult.status),
    };
  }
  getStepMessage(
    pickleStep: PickleStep,
    testCase: TestCase
  ): string | undefined {
    const testStep = testCase.testSteps.find(
      (step) => step.pickleStepId === pickleStep.id
    );
    if (testStep === undefined) {
      throw new Error('TestCase step not found');
    }
    const testStepStarted = this.testStepsStarted.find(
      (step) => step.testStepId === testStep.id
    );
    if (testStepStarted === undefined) {
      throw new Error('TestStepStarted not found');
    }
    const testStepFinished = this.testStepsFinished.find(
      (step) => step.testStepId === testStepStarted.testStepId
    );
    if (testStepFinished === undefined) {
      throw new Error('TestStepFinished not found');
    }
    return testStepFinished.testStepResult.message;
  }
  getAttachments(testCaseId: string): AttachmentPut[] | undefined {
    if (this.attachments[testCaseId] === undefined) {
      return undefined;
    }
    return this.attachments[testCaseId].map((id) => ({ id }));
  }
  addMessage(testCaseId: string, message: string): void {
    if (this.messages[testCaseId] === undefined) {
      this.messages[testCaseId] = [message];
    } else {
      this.messages[testCaseId].push(message);
    }
  }
  addLinks(testCaseId: string, links: LinkPost[]): void {
    if (this.links[testCaseId] === undefined) {
      this.links[testCaseId] = links;
    } else {
      this.links[testCaseId].push(...links);
    }
  }
  addAttachment(testCaseId: string, attachmentId: string): void {
    if (this.attachments[testCaseId] === undefined) {
      this.attachments[testCaseId] = [attachmentId];
    } else {
      this.attachments[testCaseId].concat(attachmentId);
    }
  }
}
