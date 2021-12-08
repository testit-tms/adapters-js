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
  Meta,
  TestRunStarted,
} from '@cucumber/messages';
import {
  Client,
  ClientConfigWithFile,
  IClient,
  LinkPost,
} from 'testit-api-client';
import { IStorage } from './types/storage';
import { Storage } from './storage';
import { IFormatter } from './types/formatter';
import { AutotestPostWithWorkItemId } from './mappers';
import { AxiosError } from 'axios';

export class TestItFormatter extends Formatter implements IFormatter {
  client: IClient;
  storage: IStorage = new Storage();
  currentTestCaseId: string | undefined;

  constructor(
    options: IFormatterOptions,
    config: Partial<ClientConfigWithFile>
  ) {
    super(options);
    this.client = new Client(config);
    options.eventBroadcaster.on('envelope', (envelope: Envelope) => {
      if (envelope.meta) {
        return this.onMeta(envelope.meta);
      }
      if (envelope.gherkinDocument) {
        return this.onGherkinDocument(envelope.gherkinDocument);
      }
      if (envelope.pickle) {
        return this.onPickle(envelope.pickle);
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

  private testRunId: Promise<string> | undefined;
  private testRunStarted: Promise<void> | undefined;
  private attachmentsQueue: Promise<void>[] = [];

  onMeta(_meta: Meta): void {
    const { projectId, testRunId } = this.client.getConfig();
    if (testRunId === undefined) {
      this.testRunId = this.client
        .createTestRun({
          projectId,
        })
        .then((testRun) => testRun.id);
    } else {
      this.testRunId = Promise.resolve(testRunId);
    }
  }

  onGherkinDocument(document: GherkinDocument): void {
    this.storage.saveGherkinDocument(document);
  }

  onPickle(pickle: Pickle): void {
    this.storage.savePickle(pickle);
  }

  onTestRunStarted(_testRunStarted: TestRunStarted): void {
    if (this.testRunId === undefined) {
      throw new Error('TestRunId is not yet specified');
    }
    this.testRunStarted = this.testRunId.then((id) =>
      this.client.startTestRun(id)
    );
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
    if (this.testRunId === undefined) {
      throw new Error('TestRunId is not yet specified');
    }
    if (this.testRunStarted === undefined) {
      throw new Error('Test run is not started yet');
    }

    Promise.all([
      this.testRunId,
      this.testRunStarted,
      Promise.all(this.attachmentsQueue),
    ])
      .then(async ([id]) => {
        const { configurationId } = this.client.getConfig();
        const autotests = this.storage.getAutotests(
          this.client.getConfig().projectId
        );
        const results = this.storage.getTestRunResults(configurationId);
        await Promise.all(
          autotests.map((autotestPost) => {
            const result = results.find(
              (result) => result.autotestExternalId === autotestPost.externalId
            );
            if (result === undefined) {
              throw new Error(
                `Cannot find result for ${autotestPost.externalId} autotest`
              );
            }
            if (result.outcome !== 'Passed') {
              return this.loadAutotest(autotestPost);
            }
            return this.loadPassedAutotest(autotestPost);
          })
        );
        return this.client.loadTestRunResults(id, results);
      })
      .catch((err) => {
        console.error(err);
        this.testRunId?.then((id) => this.client.completeTestRun(id));
      });
  }

  async loadAutotest(autotestPost: AutotestPostWithWorkItemId): Promise<void> {
    try {
      await this.createNewAutotest(autotestPost);
    } catch (err) {
      const axiosError = err as AxiosError;

      if (axiosError.response?.status === 409) {
        const [autotest] = await this.client.getAutotest({
          projectId: this.client.getConfig().projectId,
          externalId: autotestPost.externalId,
        });
        await this.updateAutotest({
          ...autotest,
          links: autotestPost.links,
        });
      } else {
        this.logError(axiosError);
      }
    }
  }

  async loadPassedAutotest(
    autotestPost: AutotestPostWithWorkItemId
  ): Promise<void> {
    try {
      await this.createNewAutotest(autotestPost);
    } catch (err) {
      const axiosError = err as AxiosError;
      if (axiosError.response?.status === 409) {
        await this.updateAutotest(autotestPost);
      } else {
        this.logError(axiosError);
      }
    }

    if (autotestPost.workItemId !== undefined) {
      this.linkWorkItem(autotestPost.externalId, autotestPost.workItemId);
    }
  }

  async createNewAutotest(
    autotestPost: AutotestPostWithWorkItemId
  ): Promise<void> {
    await this.client.createAutotest(autotestPost);
  }

  async updateAutotest(
    autotestPost: AutotestPostWithWorkItemId
  ): Promise<void> {
    await this.client.updateAutotest(autotestPost).catch(this.logError);
  }

  async linkWorkItem(externalId: string, workItemId: string): Promise<void> {
    const [autotest] = await this.client
      .getAutotest({
        projectId: this.client.getConfig().projectId,
        externalId: externalId,
      })
      .catch(() => []);
    if (autotest?.id !== undefined) {
      await this.client.linkToWorkItem(autotest.id, {
        id: workItemId,
      });
    }
  }

  addMessage(message: string): void {
    if (this.currentTestCaseId === undefined) {
      throw new Error('CurrentTestCaseId is not set');
    }
    this.storage.addMessage(this.currentTestCaseId, message);
  }

  addLinks(links: LinkPost[]): void {
    if (this.currentTestCaseId === undefined) {
      throw new Error('CurrentTestCaseId is not set');
    }
    this.storage.addLinks(this.currentTestCaseId, links);
  }

  addAttachments(attachments: string[]): void {
    if (this.currentTestCaseId === undefined) {
      throw new Error('CurrentTestCaseId is not set');
    }
    const currentTestCaseId = this.currentTestCaseId;
    this.attachmentsQueue.push(
      ...attachments.map(async (attachment) => {
        const { id } = await this.client.loadAttachment(attachment);
        if (id === undefined) {
          // NOTE: Why?
          console.warn('Attachment id is not returned');
          return;
        }
        this.storage.addAttachment(currentTestCaseId, id);
      })
    );
  }

  private logError(err: AxiosError): void {
    console.error(
      err.response?.status,
      err.config.method,
      err.config.url,
      err.response?.data
    );
  }

  // TODO: add stopping run on error
}
