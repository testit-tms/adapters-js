import type { AxiosError } from 'axios';
import {
  AutotestPost,
  AutotestResultsForTestRun,
  Client,
  ClientConfig,
} from 'testit-api-client';
import { debug } from './debug';
import { formatError } from './utils';

const log = debug.extend('client');

export class TestClient {
  constructor(clientConfig: Partial<ClientConfig> = {}) {
    this.client = new Client(clientConfig);
    this._testRunId = clientConfig.testRunId;
  }

  private client: Client;
  private _testRunId: string | undefined;

  get testRunId(): string {
    if (this._testRunId === undefined) {
      throw new Error('Test run id is not set');
    }
    return this._testRunId;
  }

  get projectId(): string {
    return this.client.getConfig().projectId;
  }

  get configurationId(): string {
    return this.client.getConfig().configurationId;
  }

  async createTestRun() {
    const { projectId, testRunId } = this.client.getConfig();
    if (testRunId === undefined) {
      log(
        'Test run id is not provided, creating test run for project %s',
        projectId
      );
      this._testRunId = await this.client
        .createTestRun({ projectId })
        .then((testRun) => testRun.id);
    } else {
      log('Using provided test run id %s', testRunId);
      this._testRunId = testRunId;
    }
    log('Starting test run %s', this.testRunId);
    return this.testRunId;
  }

  async startTestRun() {
    log('Starting test run %s', this.testRunId);
    await this.client.startTestRun(this.testRunId);
  }

  async completeTestRun() {
    log('Completing test run %s', this.testRunId);
    const testRun = await this.client.getTestRun(this.testRunId);
    if (testRun.stateName === 'InProgress') {
      await this.client.completeTestRun(this.testRunId);
    }
  }

  async loadAutotest(autotestPost: AutotestPost) {
    try {
      log('Creating autotest %o', autotestPost);
      const { id } = await this.client.createAutotest(autotestPost);
      return id!;
    } catch (err) {
      const axiosError = err as AxiosError;
      if (axiosError.response?.status === 409) {
        log(
          'Autotest %s already exists, updating with %o',
          autotestPost.externalId,
          autotestPost
        );
        const [autotest] = await this.client.getAutotest({
          projectId: this.client.getConfig().projectId,
          externalId: autotestPost.externalId,
        });
        await this.client.updateAutotest({
          ...autotest,
          links: autotest.links,
        });
        return autotest.id!;
      } else {
        console.error(formatError(err));
        throw err;
      }
    }
  }

  async loadPassedAutotest(autotest: AutotestPost) {
    try {
      log('Creating autotest %o', autotest);
      await this.client.createAutotest(autotest);
    } catch (err) {
      const axiosError = err as AxiosError;
      if (axiosError.response?.status === 409) {
        log(
          'Autotest %s already exists, updating with %o',
          autotest.externalId,
          autotest
        );
        await this.client.updateAutotest(autotest);
      } else {
        console.error(formatError(err));
        throw err;
      }
    }
  }

  async getAutotestId(externalId: string): Promise<string> {
    const [autotest] = await this.client.getAutotest({
      projectId: this.client.getConfig().projectId,
      externalId,
    });
    return autotest.id!;
  }

  async linkWorkItem(externalId: string, workItemId: string) {
    log('Linking work item %s to autotest %s', workItemId, externalId);
    return this.client.linkToWorkItem(externalId, { id: workItemId });
  }

  async loadAutotestResults(results: AutotestResultsForTestRun[]) {
    log('Loading autotest results %o', results);
    await this.client.loadTestRunResults(this.testRunId, results);
  }

  async uploadAttachments(attachments: string[]): Promise<string[]> {
    const attachmentIds: string[] = [];
    for (const attachment of attachments) {
      try {
        log('Uploading attachment %s', attachment);
        const { id } = await this.client.loadAttachment(attachment);
        if (!id) {
          log('Attachment id is not returned');
          continue;
        }
        attachmentIds.push(id);
      } catch (err) {
        console.error(`Failed to load attachment`, formatError(err));
      }
    }
    return attachmentIds;
  }
}
