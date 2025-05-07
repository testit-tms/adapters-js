import { TestRunsApi, TestRunsApiApiKeys } from "testit-api-client";
import { AdapterConfig } from "../../common";
import { BaseService } from "../base.service";
import { type ITestRunsService, TestRunId, AutotestResult, TestRunGet, AutotestResultGet } from "./testruns.type";
import { type ITestRunConverter, TestRunConverter } from "./testruns.converter";
import { TestRunErrorHandler } from "./testruns.handler";

const testRunsApiKey = TestRunsApiApiKeys["Bearer or PrivateToken"];

export class TestRunsService extends BaseService implements ITestRunsService {
  protected _client: TestRunsApi;
  protected _converter: ITestRunConverter;
  private _options: any;

  constructor(protected readonly config: AdapterConfig) {
    super(config);
    this._client = new TestRunsApi(config.url);
    this._converter = new TestRunConverter(config);
    this._client.setApiKey(testRunsApiKey, `PrivateToken ${config.privateToken}`);
    this._options = {
      headers: {},
      rejectUnauthorized: config.certValidation,
    };
  }

  public async createTestRun(): Promise<TestRunId> {
    return await this._client
      .createEmpty({
        projectId: this.config.projectId,
        name: this.config.testRunName,
      }, this._options)
      .then(({ body }) => body.id);
  }

  public async startTestRun(testRunId: TestRunId): Promise<void> {
    try {
      const testRun = await this.getTestRun(testRunId);
      if (testRun.stateName !== "Completed" && testRun.stateName !== "InProgress") {
        await this._client.startTestRun(testRunId, this._options);
      }
    } catch (err) {
      TestRunErrorHandler.handleErrorStartTestRun(err);
    }
  }

  public async completeTestRun(testRunId: TestRunId): Promise<void> {
    try {
      const testRun = await this.getTestRun(testRunId);
      if (testRun.stateName === "InProgress") {
        await this._client.completeTestRun(testRunId, this._options);
      }
    } catch (err) {
      TestRunErrorHandler.handleErrorCompletedTestRun(err);
    }
  }

  public async loadAutotests(testRunId: string, autotests: Array<AutotestResult>) {
    const autotestResults = autotests.map((test) => this._converter.toOriginAutotestResult(test));
    for(const autotestResult of autotestResults) {
      await this._client.setAutoTestResultsForTestRun(testRunId, [autotestResult], this._options);
    }
  }

  public async getAutotests(testRunId: string): Promise<AutotestResultGet[] | undefined> {
    const testRun = await this.getTestRun(testRunId);
    return testRun.testResults?.filter((autotest) => autotest.configurationId === this.config.configurationId);
  }

  public async getTestRun(testRunId: TestRunId): Promise<TestRunGet> {
    return await this._client
      .getTestRunById(testRunId, this._options)
      .then(({ body }) => body)
      .then((run) => this._converter.toLocalTestRun(run));
  }
}
