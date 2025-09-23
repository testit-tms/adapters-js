import { TestRunsApi, TestRunsApiApiKeys } from "testit-api-client";
import { AdapterConfig, BaseService } from "../../common";
import { escapeHtmlInObject, escapeHtmlInObjectArray } from "../../common/utils";
import { type ITestRunsService, TestRunId, AutotestResult, TestRunGet, AutotestResultGet } from "./testruns.type";
import { type ITestRunConverter, TestRunConverter } from "./testruns.converter";
import { TestRunErrorHandler } from "./testruns.handler";

const testRunsApiKey = TestRunsApiApiKeys["Bearer or PrivateToken"];

export class TestRunsService extends BaseService implements ITestRunsService {
  protected _client: TestRunsApi;
  protected _converter: ITestRunConverter;

  constructor(protected readonly config: AdapterConfig) {
    super(config);
    this._client = new TestRunsApi(config.url);
    this._converter = new TestRunConverter(config);
    this._client.setApiKey(testRunsApiKey, `PrivateToken ${config.privateToken}`);
    if (config.certValidation !== undefined) {
      this._client.setRejectUnauthorized(config.certValidation);
    }
  }

  public async createTestRun(): Promise<TestRunId> {
    const createRequest = {
      projectId: this.config.projectId,
      name: this.config.testRunName,
    };

    return await this._client
      .createEmpty(escapeHtmlInObject(createRequest))
      .then(({ body }) => body.id);
  }

  public async startTestRun(testRunId: TestRunId): Promise<void> {
    try {
      const testRun = await this.getTestRun(testRunId);
      if (testRun.stateName !== "Completed" && testRun.stateName !== "InProgress") {
        await this._client.startTestRun(testRunId);
      }
    } catch (err) {
      TestRunErrorHandler.handleErrorStartTestRun(err);
    }
  }

  public async completeTestRun(testRunId: TestRunId): Promise<void> {
    try {
      const testRun = await this.getTestRun(testRunId);
      if (testRun.stateName === "InProgress") {
        await this._client.completeTestRun(testRunId);
      }
    } catch (err) {
      TestRunErrorHandler.handleErrorCompletedTestRun(err);
    }
  }

  public async loadAutotests(testRunId: string, autotests: Array<AutotestResult>) {
    const autotestResults = autotests.map((test) => this._converter.toOriginAutotestResult(test));
    escapeHtmlInObjectArray(autotestResults);
    
    for(const autotestResult of autotestResults) {
      await this._client.setAutoTestResultsForTestRun(testRunId, [autotestResult]);
    }
  }

  public async getTestRun(testRunId: TestRunId): Promise<TestRunGet> {
    return await this._client
      .getTestRunById(testRunId)
      .then(({ body }) => body)
      .then((run) => this._converter.toLocalTestRun(run));
  }
}
