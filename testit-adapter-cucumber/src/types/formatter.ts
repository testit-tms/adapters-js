import {
    GherkinDocument,
    Meta,
    Pickle,
    TestCase,
    TestCaseFinished,
    TestCaseStarted,
    TestStepFinished,
    TestStepStarted,
} from '@cucumber/messages';

export interface IFormatter {
    onMeta(_meta: Meta): void;
    onGherkinDocument(document: GherkinDocument): void;
    onPickle(pickle: Pickle): void;
    onTestCase(testCase: TestCase): void;
    onTestCaseStarted(testCaseStarted: TestCaseStarted): void;
    testStepStarted(testStepStarted: TestStepStarted): void;
    onTestStepFinished(testStepFinished: TestStepFinished): void;
    testCaseFinished(testCaseFinished: TestCaseFinished): void;
}
