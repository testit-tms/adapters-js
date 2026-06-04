import {
  GherkinDocument,
  Pickle,
  TestCase,
  TestCaseFinished,
  TestCaseStarted,
  TestStepFinished,
  TestStepStarted,
} from "@cucumber/messages";
import { Attachment, AutotestPost, AutotestResult, Link } from "testit-js-commons";

export interface IStorage {
  saveGherkinDocument(document: GherkinDocument): void;
  savePickle(pickle: Pickle): void;
  saveTestCase(testCase: TestCase): void;
  saveTestCaseStarted(testCaseStarted: TestCaseStarted): void;
  saveTestCaseFinished(testCaseFinished: TestCaseFinished): void;
  saveTestStepStarted(testStepStarted: TestStepStarted): void;
  saveTestStepFinished(testStepFinished: TestStepFinished): void;

  isResolvedTestCase(testCase: TestCase): boolean;

  resolvePickleExternalId(pickle: Pickle): string;

  getAutotests(): AutotestPost[];
  getTestRunResults(): AutotestResult[];
  getRealtimePayload(
    testCaseStartedId: string,
  ): { autotest: AutotestPost; result: AutotestResult } | undefined;
  listCatchUpRealtimePayloads(
    sentTestCaseStartedIds: ReadonlySet<string>,
  ): Array<{ testCaseStartedId: string; autotest: AutotestPost; result: AutotestResult }>;

  addMessage(testCaseId: string, message: string): void;
  addLinks(testCaseId: string, links: Link[]): void;
  addAttachments(testCaseId: string, attachments: Attachment[]): void;
}
