import {
    GherkinDocument,
    Pickle,
    TestCase,
    TestCaseFinished,
    TestCaseStarted,
    TestStepFinished,
    TestStepStarted,
} from '@cucumber/messages';
import { Link } from 'testit-js-commons/types/link';
import { TestResult } from './test-result';

export interface IStorage {
    saveGherkinDocument(document: GherkinDocument): void;
    getTestResult(testId: string): TestResult;
    savePickle(pickle: Pickle): void;
    isResolvedTestCase(testCase: TestCase): boolean;
    saveTestCase(testCase: TestCase): void;
    saveTestCaseStarted(testCaseStarted: TestCaseStarted): void;
    saveTestCaseFinished(testCaseFinished: TestCaseFinished): void;
    saveTestStepStarted(testStepStarted: TestStepStarted): void;
    saveTestStepFinished(testStepFinished: TestStepFinished): void;
    addMessage(testCaseId: string, message: string): void;
    addLinks(testCaseId: string, links: Link[]): void;
    addAttachment(testCaseId: string, attachmentId: string): void;
}
