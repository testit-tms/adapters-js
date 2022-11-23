import { Formatter, IFormatterOptions } from '@cucumber/cucumber';
import {
    Envelope,
    Meta,
    GherkinDocument,
    Pickle,
    TestCase,
    TestStepFinished,
    TestRunFinished,
    TestCaseStarted,
    TestCaseFinished,
    TestStepStarted,
} from '@cucumber/messages';
import { unlinkSync, writeFileSync} from 'fs';
import {v4 as uuidv4} from 'uuid';
import { join } from 'path';
import {
    Adapter,
    AdapterManager,
    AdapterProperties,
    Link
} from 'testit-js-commons';
import { IFormatter } from './types/formatter';
import { parseTags } from './tags-parser';
import { IStorage } from './types/storage';
import { Storage } from './scenario-storage';

export class TestItFormatter extends Formatter implements IFormatter {
    private storage: IStorage = new Storage();
    private adapterManager: AdapterManager;
    private resolvedAutotests: Promise<string[] | void>;
    private testRunStarted: Promise<void> | undefined;
    currentTestCaseId: string | undefined;

    constructor(
        options: IFormatterOptions,
        properties: Partial<AdapterProperties>
    ) {
        super(options);

        this.adapterManager = Adapter.getAdapterManager(properties);
        this.resolvedAutotests = this.adapterManager.getAutotestsForLaunch();

        options.eventBroadcaster.on('envelope', (envelope: Envelope) => {
            if (envelope.meta) {
                return this.onMeta(envelope.meta);
            }
            if (envelope.gherkinDocument) {
                return this.onGherkinDocument(envelope.gherkinDocument);
            }
            if (envelope.pickle) {
                this.resolvedAutotests.then(resolvedAutotests => {
                    if (resolvedAutotests !== undefined) {
                        if (resolvedAutotests.length > 0) {
                            const tags = parseTags(envelope.pickle!.tags);
                            for (const externalId of resolvedAutotests) {
                                if (externalId === tags.externalId) {
                                    return this.onPickle(envelope.pickle!);
                                }
                            }
                        }
                        envelope.pickle = undefined;
                    } else {
                        return this.onPickle(envelope.pickle!);
                    }
                });
            }
            if (envelope.testCase) {
                return this.onTestCase(envelope.testCase);
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
        });
        options.supportCodeLibrary.World.prototype.addMessage =
            this.addMessage.bind(this);
        options.supportCodeLibrary.World.prototype.addLinks =
            this.addLinks.bind(this);
        options.supportCodeLibrary.World.prototype.addAttachments =
            this.addAttachments.bind(this);
    }

    onMeta(_meta: Meta): void {
        this.testRunStarted = this.adapterManager.startLaunch();
    }

    onGherkinDocument(document: GherkinDocument): void {        
        this.storage.saveGherkinDocument(document);
    }

    onPickle(pickle: Pickle): void {
        this.storage.savePickle(pickle);
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
        this.storage.saveTestCaseFinished(testCaseFinished);
        if (this.testRunStarted === undefined) {
            throw new Error('Test run is not started');
        }
        
        this.testRunStarted
            .then(() => {
                if (this.currentTestCaseId !== undefined) {
                    this.adapterManager.writeTest(
                        this.storage.getTestResult(this.currentTestCaseId)
                    )
                }
            });

        this.currentTestCaseId = undefined;
    }

    addMessage(message: string): void {
        if (this.currentTestCaseId === undefined) {
            throw new Error('CurrentTestCaseId is not set');
        }
        this.storage.addMessage(this.currentTestCaseId, message);
    }

    addLinks(links: Link[]): void {
        if (this.currentTestCaseId === undefined) {
            throw new Error('CurrentTestCaseId is not set');
        }
        this.storage.addLinks(this.currentTestCaseId, links);
    }

    async addAttachments(data: string[] | string, isText: boolean = false, name?: string): Promise<void> {
        if (isText) {
            if (name == undefined) {
                name = uuidv4() + '-attachment.txt';
            }

            const attachmentPath = join(__dirname, name);

            writeFileSync(attachmentPath, data.toString(), {
                flag: 'w',
            });
            this.loadAttachment(attachmentPath);
            unlinkSync(attachmentPath);
        } else if (typeof data == 'string') {
            this.loadAttachment(data);
        } else {
            for (const attachmentPath of data) {
                this.loadAttachment(attachmentPath);
            }
        }
    }

    async loadAttachment(attachmentPath: string): Promise<void> {
        if (this.currentTestCaseId === undefined) {
            throw new Error('CurrentTestCaseId is not set');
        }

        const currentTestCaseId = this.currentTestCaseId;

        const { id } = await this.adapterManager.loadAttachment(attachmentPath);
    
        if (id === undefined) {
            // NOTE: Why?
            console.warn('Attachment id is not returned');
        }

        this.storage.addAttachment(currentTestCaseId, id);
    }
}
