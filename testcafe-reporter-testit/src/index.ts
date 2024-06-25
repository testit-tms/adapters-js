import TmsReporter from './reporter';
import { Link } from 'testit-js-commons';
import { TestRunInfo } from './types';

const testsData: {[index: string]:any} = {};

module.exports = function() {
    return {
        reporter: null,

        async reportTaskStart(startTime: Date, userAgents: string[]): Promise<void> {
            this.reporter = new TmsReporter();
        },

        async reportFixtureStart(name: string, path: string, meta: object): Promise<void> {
            await this.reporter.onFixtureBegin(name, path, meta);
        },

        async reportTestDone(name: string, testRunInfo: TestRunInfo, meta: object): Promise<void> {
            await this.reporter.onTestEnd(
                name,
                testRunInfo,
                meta,
                testsData[testRunInfo.testId]);
        },

        async reportTaskDone(): Promise<void> {
            await this.reporter.onEnd();
        },

        addMessage(t: any, message: string) {
            if (t === undefined) {
                return;
            }
            if (t.testRun === undefined) {
                return;
            }
            if (t.testRun.test === undefined) {
                return;
            }
            if (t.testRun.test.id === undefined) {
                return;
            }
            const id = t.testRun.test.id;
            if (testsData[id] === undefined) {
                testsData[id] = {};
            }
            testsData[id].message = message;

        },
        
        addAttachments(t: any, paths: string[] | string) {
            if (t === undefined) {
                return;
            }
            if (t.testRun === undefined) {
                return;
            }
            if (t.testRun.test === undefined) {
                return;
            }
            if (t.testRun.test.id === undefined) {
                return;
            }
            const id = t.testRun.test.id;
            if (testsData[id] === undefined) {
                testsData[id] = {};
            }

            if (Array.isArray(paths)) {
                testsData[id].attachments = paths;
            } else if (testsData[id].attachments !== undefined) {
                testsData[id].attachments.append(paths);
            } else {
                testsData[id].attachments = [paths];
            }
        },
        
        addLinks(t: any, links: Link[]) {
            if (t === undefined) {
                return;
            }
            if (t.testRun === undefined) {
                return;
            }
            if (t.testRun.test === undefined) {
                return;
            }
            if (t.testRun.test.id === undefined) {
                return;
            }
            const id = t.testRun.test.id;
            if (testsData[id] === undefined) {
                testsData[id] = {};
            }
            testsData[id].links = links;
        },
    };
}
