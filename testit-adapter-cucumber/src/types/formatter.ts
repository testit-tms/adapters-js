import {
  GherkinDocument,
  Meta,
  Pickle,
  TestCase,
  TestCaseFinished,
  TestCaseStarted,
  TestRunFinished,
  TestRunStarted,
  TestStepFinished,
  TestStepStarted,
} from '@cucumber/messages';
import { IClient } from 'testit-api-client';
import { IStorage } from './storage';
import { AutotestPostWithWorkItemId } from '../mappers';

export interface IFormatter {
  client: IClient;
  storage: IStorage;
  currentTestCaseId: string | undefined;
  resolvedAutotests: Array<string | undefined> | undefined;
  onMeta(meta: Meta): void;
  onGherkinDocument(document: GherkinDocument): void;
  onPickle(pickle: Pickle): void;
  onTestCase(testCase: TestCase): void;
  onTestCaseStarted(testCaseStarted: TestCaseStarted): void;
  testStepStarted(testStepStarted: TestStepStarted): void;
  onTestStepFinished(testStepFinished: TestStepFinished): void;
  testCaseFinished(testCaseFinished: TestCaseFinished): void;
  onTestRunFinished(_testRunFinished: TestRunFinished): void;
  loadAutotest(autotestPost: AutotestPostWithWorkItemId): Promise<void>;
  loadPassedAutotest(autotestPost: AutotestPostWithWorkItemId): Promise<void>;
  createTestRun(): void;
  createNewAutotest(autotestPost: AutotestPostWithWorkItemId): Promise<void>;
  updateAutotest(autotestPost: AutotestPostWithWorkItemId): Promise<void>;
  linkWorkItem(externalId: string, workItemId: string): Promise<void>;
}
