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
import { ApiClientWorker } from '../client/api-client';
import { IStorage } from './storage';

export interface IFormatter {
    clientWorker: ApiClientWorker;
    storage: IStorage;
    onGherkinDocument(document: GherkinDocument): void;
    onPickle(pickle: Pickle): void;
    onTestRunStarted(testRunStarted: TestRunStarted): void;
    onTestCase(testCase: TestCase): void;
    onTestCaseStarted(testCaseStarted: TestCaseStarted): void;
    testStepStarted(testStepStarted: TestStepStarted): void;
    onTestStepFinished(testStepFinished: TestStepFinished): void;
    testCaseFinished(testCaseFinished: TestCaseFinished): void;
    onTestRunFinished(_testRunFinished: TestRunFinished): void;
}
