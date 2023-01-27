import axios from 'axios';
import { Attachment, Autotest, AutotestPost, AutotestPut, AutotestResultsForTestRun, Client, TestRunGet } from 'testit-api-client';
import { Logger } from '../common/classes/logger.class';
import { Origin } from '../types/origin.type';
import { HttpClientErrors } from './http-client.errors';


export class DefaultHttpClient {
  public readonly http: Client;

  constructor(
    public readonly config: Origin.Config,
    private readonly logger: Logger
  ) {
    if (!this.config) {
      HttpClientErrors.throwNotFoundHttpClientConfig();
    }

    try {
      this.http = new Client(this.config);
    } catch (e) {
      this.logger.warn(e);
    }
  }

  public hasInSystem(id: string): Promise<Autotest | null> {
    const query = { projectId: this.config.projectId, externalId: id };

    return this.http
      .getAutotest(query)
      .then(([test]) => test);
  }

  public create(test: AutotestPost): Promise<Autotest | void> {
    return this.http.createAutotest(test)
      .catch(error => {
        this.logger.error(error);

        HttpClientErrors.throwErrorAfterTestCreate(test);
      });
  }

  public loadAttachment(path: string): Promise<Attachment | void> {
    return this.http.loadAttachment(path)
      .catch(error => {
        this.logger.error(error);

        HttpClientErrors.throwNotUploadAttachments(path);
      });
  }

  public update(test: AutotestPut): Promise<void> {
    return this.http.updateAutotest(test)
      .catch(error => {
        this.logger.error(error);

        HttpClientErrors.throwErrorAfterTestUpdate(test);
      });
  }

  public async validate() {
    try {
      await this.http.checkConnection();
    } catch (e) {
      this.logger.error(e);

      throw new Error();
    }
  }

  public async updateRuns(result: AutotestResultsForTestRun, run = this.config.testRunId) {
    await this.http.loadTestRunResults(run, [result]);
  }

  public async updateManyRuns(result: AutotestResultsForTestRun[], run = this.config.testRunId) {
    await this.http.loadTestRunResults(run, result);
  }
  public async createEmptyRun(name = '') {
    return this.http
      .createTestRun({ name, projectId: this.config.projectId })
      .catch((error) => this.logger.error(error));
  }

  public async linkToWorkItem(autotestId: string, ids: string[]) {
    for (const id of ids) {
      try {
        await this.http.linkToWorkItem(autotestId, { id });

        this.logger.log(`Test - ${autotestId} linked with WI - ${ids}`);
      } catch (error) {
        this.logger.error(error);
      }
    }
  }

  public async startRunIfNeeded(id: string) {
    try {
      const run = await this.getRun(id);

      if (run.stateName !== 'Completed') {
        await this.http.startTestRun(id);

        this.logger.log(`Test run  - ${run.id} started`);
      }
    } catch (error) {
      this.logger.error(error);
    }
  }

  public async completeRunIfNeeded(id: string) {
    try {
      const run = await this.getRun(id);

      if (run.stateName !== 'Completed') {
        await this.http.completeTestRun(id);

        this.logger.log(`Test run - ${run.id} completed`);
      }
    } catch (e) {
      this.logger.error(e);
    }
  }

  public getRun(id: string): Promise<TestRunGet> {
    const baseURL = new URL('/api/v2', this.config.url).toString();
    const client = axios.create({
      baseURL,
      headers: {
        Authorization: `PrivateToken ${this.config.privateToken}`
      }
    });

    return client.get(`testRuns/${id}`).then(response => response.data);
  }

  public async getTestsIdsByRunId(id: string): Promise<string[]> {
    const run = await this.getRun(id);
    
    return run.testResults
      .filter(test => test.configurationId === this.config.configurationId)
      .map(test => test.autoTest.externalId);
  }
}
