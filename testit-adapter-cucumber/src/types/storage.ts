import {
  GherkinDocument,
  Pickle,
  TestCase,
  TestCaseFinished,
  TestCaseStarted,
  TestStepFinished,
  TestStepStarted,
} from '@cucumber/messages';
import { AutotestResultsForTestRun, LinkPost } from 'testit-api-client';
import { AutotestPostWithWorkItemId } from '../mappers';

export interface IStorage {
  saveGherkinDocument(document: GherkinDocument): void;
  getAutotests(projectId: string): AutotestPostWithWorkItemId[];
  savePickle(pickle: Pickle): void;
  isResolvedTestCase(testCase: TestCase): boolean;
  saveTestCase(testCase: TestCase): void;
  saveTestCaseStarted(testCaseStarted: TestCaseStarted): void;
  saveTestCaseFinished(testCaseFinished: TestCaseFinished): void;
  saveTestStepStarted(testStepStarted: TestStepStarted): void;
  saveTestStepFinished(testStepFinished: TestStepFinished): void;
  getTestRunResults(configurationId: string): AutotestResultsForTestRun[];
  addMessage(testCaseId: string, message: string): void;
  addLinks(testCaseId: string, links: LinkPost[]): void;
  addAttachment(testCaseId: string, attachmentId: string): void;
}
