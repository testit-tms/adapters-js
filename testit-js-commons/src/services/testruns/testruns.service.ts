// @ts-ignore
import TestitApiClient from "testit-api-client";
import { AdapterConfig, BaseService } from "../../common";
import { escapeHtmlInObject, escapeHtmlInObjectArray } from "../../common/utils";
import { type ITestRunsService, TestRunId, AutotestResult, TestRunGet } from "./testruns.type";
import { type ITestRunConverter, TestRunConverter } from "./testruns.converter";
import { TestRunErrorHandler } from "./testruns.handler";


export class TestRunsService extends BaseService implements ITestRunsService {
  protected _client;
  protected _converter: ITestRunConverter;

  constructor(protected readonly config: AdapterConfig) {
    super(config);
    this._client = new TestitApiClient.TestRunsApi();
    this._converter = new TestRunConverter(config);
  }

  public async createTestRun(): Promise<TestRunId> {
    const createRequest = {
      projectId: this.config.projectId,
      name: this.config.testRunName,
    };

    return await this._client
      .createEmpty({ createEmptyTestRunApiModel: escapeHtmlInObject(createRequest)})
      // @ts-ignore
      .then(({ body }) => body.id);
  }

  public async getTestRun(testRunId: TestRunId): Promise<TestRunGet> {
    return await this._client
      .getTestRunById(testRunId)
      // @ts-ignore
      .then(({ body }) => body)
      // @ts-ignore
      .then((run) => this._converter.toLocalTestRun(run));
  }

  public async updateTestRun(testRun: TestRunGet): Promise<void> {
    await this._client
      .updateEmpty({ updateEmptyTestRunApiModel: testRun })
      // @ts-ignore
      .then(({ body }) => body)
      // @ts-ignore
      .then((run) => this._converter.toLocalTestRun(run));
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
      await this._client.setAutoTestResultsForTestRun(testRunId, { autoTestResultsForTestRunModel: [autotestResult] });
    }
  }
}
