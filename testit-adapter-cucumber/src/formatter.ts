import { Formatter, IFormatterOptions } from '@cucumber/cucumber';
import {
    Envelope,
    GherkinDocument,
    Pickle,
    TestCase,
    TestStepFinished,
    TestRunFinished,
    TestCaseStarted,
    TestCaseFinished,
    TestStepStarted,
    TestRunStarted,
} from '@cucumber/messages';
import { ApiClientWorker } from './client/api-client';
import { ClientConfiguration } from './client/client-configuration';
import { AppPropetries } from './app-properties';
import { Properties } from './types/properties';
import { IStorage } from './types/storage';
import { Storage } from './storage';
import { IFormatter } from './types/formatter';
import { parseTags } from './utils';
import { LinkPostModel } from 'testit-api-client';

export class TestItFormatter extends Formatter implements IFormatter {
    clientWorker: ApiClientWorker;
    storage: IStorage = new Storage();
    currentTestCaseId: string | undefined;
    resolvedAutotests: Array<string | undefined> | undefined;

    constructor(
        options: IFormatterOptions,
        properties: Partial<Properties>
    ) {
        super(options);

        var clientConfig = new ClientConfiguration(
            AppPropetries.loadProperties(properties)
        );

        this.clientWorker = new ApiClientWorker(clientConfig);
        options.eventBroadcaster.on('envelope', (envelope: Envelope) => {
            if (envelope.gherkinDocument) {
                return this.onGherkinDocument(envelope.gherkinDocument);
            }
            if (envelope.pickle) {
                if (this.resolvedAutotests !== undefined) {
                    if (this.resolvedAutotests.length > 0) {
                        const tags = parseTags(envelope.pickle.tags);
                        for (const externalId of this.resolvedAutotests) {
                            if (externalId === tags.externalId) {
                                return this.onPickle(envelope.pickle);
                            }
                        }
                    }
                    envelope.pickle = undefined;
                } else {
                    return this.onPickle(envelope.pickle);
                }
            }
            if (envelope.testCase) {
                return this.onTestCase(envelope.testCase);
            }
            if (envelope.testRunStarted) {
                return this.onTestRunStarted(envelope.testRunStarted);
            }
            if (envelope.testCaseStarted) {
                return this.onTestCaseStarted(envelope.testCaseStarted);
            }
            if (envelope.testStepStarted) {
                return this.testStepStarted(envelope.testStepStarted);
            }
            if (envelope.testStepFinished) {
                return this.onTestStepFinished(envelope.testStepFinished);
            }
            if (envelope.testCaseFinished) {
                return this.testCaseFinished(envelope.testCaseFinished);
            }
            if (envelope.testRunFinished) {
                return this.onTestRunFinished(envelope.testRunFinished);
            }
        });
        options.supportCodeLibrary.World.prototype.addMessage =
            this.addMessage.bind(this);
        options.supportCodeLibrary.World.prototype.addLinks =
            this.addLinks.bind(this);
        options.supportCodeLibrary.World.prototype.addAttachments =
            this.addAttachments.bind(this);
    }

    onGherkinDocument(document: GherkinDocument): void {
        this.storage.saveGherkinDocument(document);
    }

    onPickle(pickle: Pickle): void {
        this.storage.savePickle(pickle);
    }

    onTestRunStarted(_testRunStarted: TestRunStarted): void {
        this.clientWorker.startLaunch();
    }

    onTestCase(testCase: TestCase): void {
        this.storage.saveTestCase(testCase);
    }

    onTestCaseStarted(testCaseStarted: TestCaseStarted): void {
        this.currentTestCaseId = testCaseStarted.testCaseId;
        this.storage.saveTestCaseStarted(testCaseStarted);
    }

    testStepStarted(testStepStarted: TestStepStarted): void {
        this.storage.saveTestStepStarted(testStepStarted);
    }

    onTestStepFinished(testStepFinished: TestStepFinished): void {
        this.storage.saveTestStepFinished(testStepFinished);
    }

    testCaseFinished(testCaseFinished: TestCaseFinished): void {
        this.currentTestCaseId = undefined;
        this.storage.saveTestCaseFinished(testCaseFinished);
    }

    onTestRunFinished(_testRunFinished: TestRunFinished): void {
        this.clientWorker.writeTests(this.storage);
    }

    addMessage(message: string): void {
        if (this.currentTestCaseId === undefined) {
            throw new Error('CurrentTestCaseId is not set');
        }
        this.storage.addMessage(this.currentTestCaseId, message);
    }

    addLinks(links: LinkPostModel[]): void {
        if (this.currentTestCaseId === undefined) {
            throw new Error('CurrentTestCaseId is not set');
        }
        this.storage.addLinks(this.currentTestCaseId, links);
    }

    async addAttachments(attachments: string[]): Promise<void> {
        if (this.currentTestCaseId === undefined) {
            throw new Error('CurrentTestCaseId is not set');
        }

        const currentTestCaseId = this.currentTestCaseId;

        for (const attachment  of attachments) {
            const { id } = await this.clientWorker.loadAttachment(attachment);

            if (id === undefined) {
                // NOTE: Why?
                console.warn('Attachment id is not returned');
                continue;
            }

            this.storage.addAttachment(currentTestCaseId, id);
        }
    }
}
