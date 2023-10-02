import {
  GherkinDocument,
  Pickle,
  TestCase,
  TestCaseFinished,
  TestCaseStarted,
  TestRunFinished,
  TestStepFinished,
  TestStepStarted,
} from "@cucumber/messages";

export interface IFormatter {
  onGherkinDocument(document: GherkinDocument): void;
  onPickle(pickle: Pickle): void;
  onTestCase(testCase: TestCase): void;
  onTestCaseStarted(testCaseStarted: TestCaseStarted): void;
  testStepStarted(testStepStarted: TestStepStarted): void;
  onTestStepFinished(testStepFinished: TestStepFinished): void;
  testCaseFinished(testCaseFinished: TestCaseFinished): void;
  onTestRunFinished(_testRunFinished: TestRunFinished): void;
}
