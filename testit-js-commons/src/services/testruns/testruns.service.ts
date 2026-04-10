// @ts-ignore
import * as TestitApiClient from "testit-api-client";
import { AdapterConfig, BaseService } from "../../common";
import { escapeHtmlInObject, escapeHtmlInObjectArray, logTmsLoadTestRun } from "../../common/utils";
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
      .createEmpty({ createEmptyTestRunApiModel: escapeHtmlInObject(createRequest) })
      // @ts-ignore
      .then((response) => {
        //console.debug("Full response from createEmpty:", response);
        const data = response.body || response;
        if (!data) {
          throw new Error("API returned undefined response");
        }
        if (!data.id) {
          throw new Error("API response missing 'id' field: " + JSON.stringify(data));
        }
        return data.id;
      })
      .catch((err: any) => {
        console.error("Error in createTestRun:", err);
        throw err;
      });
  }

  public async getTestRun(testRunId: TestRunId): Promise<TestRunGet> {
    return await this._client
      .getTestRunById(testRunId)
      // @ts-ignore
      .then((response) => {
        const data = response.body || response;
        return data;
      })
      // @ts-ignore
      .then((run) => this._converter.toLocalTestRun(run));
  }

  public async updateTestRun(testRun: TestRunGet): Promise<void> {
    await this._client
      .updateEmpty({ updateEmptyTestRunApiModel: testRun })
      // @ts-ignore
      .then((response) => {
        console.log("Full response from updateEmpty:", response);
        const data = response.body || response;
        if (!data) {
          throw new Error("API returned undefined response");
        }
        return data;
      })
      // @ts-ignore
      .then((run) => this._converter.toLocalTestRun(run));
  }

  public async startTestRun(testRunId: TestRunId): Promise<void> {
    try {
      const testRun = await this.getTestRun(testRunId);
      if (testRun.stateName === "NotStarted") {
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

  public async postInProgressAutotestResult(testRunId: string, result: AutotestResult): Promise<void> {
    const model = this._converter.toOriginAutotestResultInProgress(result);
    escapeHtmlInObjectArray([model]);
    logTmsLoadTestRun("POST setAutoTestResults (InProgress stub)", {
      testRunId,
      autoTestExternalId: model.autoTestExternalId,
      statusType: model.statusType,
      statusCode: model.statusCode,
      hasStartedOn: Boolean(model.startedOn),
    });
    await this._client.setAutoTestResultsForTestRun(testRunId, { autoTestResultsForTestRunModel: [model] });
    logTmsLoadTestRun("POST setAutoTestResults (InProgress stub) done", {
      autoTestExternalId: model.autoTestExternalId,
    });
  }

  public async loadAutotests(testRunId: string, results: Array<AutotestResult>) {
    const autotestResultsForTestRun = results.map((result) => this._converter.toOriginAutotestResult(result));
    escapeHtmlInObjectArray(autotestResultsForTestRun);

    for (const autotestResult of autotestResultsForTestRun) {
      logTmsLoadTestRun("POST setAutoTestResults (final)", {
        testRunId,
        autoTestExternalId: autotestResult.autoTestExternalId,
        statusType: autotestResult.statusType,
        statusCode: autotestResult.statusCode,
        stepCount: autotestResult.stepResults?.length ?? 0,
      });
      await this.sendAutotestResultWithRetry(testRunId, autotestResult).catch((err: any) => {
        const normalized = err?.body ?? err?.error ?? err;
        console.error("[testit-js-commons:loadTestRun] FAILED to post final result", {
          testRunId,
          autoTestExternalId: autotestResult.autoTestExternalId,
          error: normalized,
        });
      });
    }
  }

  private async sendAutotestResultWithRetry(testRunId: string, autotestResult: any): Promise<void> {
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this._client.setAutoTestResultsForTestRun(testRunId, { autoTestResultsForTestRunModel: [autotestResult] });
        return;
      } catch (err: any) {
        const code = err?.code;
        const status = err?.status ?? err?.statusCode;
        const msg = String(err?.message ?? err ?? "");
        const transient =
          code === "ECONNRESET" ||
          code === "ETIMEDOUT" ||
          code === "EPIPE" ||
          code === "ECONNABORTED" ||
          msg.includes("socket hang up") ||
          msg.includes("read ECONNRESET") ||
          (typeof status === "number" && status >= 500);
        if (!transient || attempt === maxAttempts) {
          throw err;
        }
        await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
      }
    }
  }
}
