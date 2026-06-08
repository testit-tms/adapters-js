// @ts-ignore
import * as TestitApiClient from "testit-api-client";
import { AdapterConfig, BaseService } from "../../common";
import { escapeHtmlInObject, escapeHtmlInObjectArray, logTmsLoadTestRun, withHttpRetry } from "../../common/utils";
import { TestResultsService } from "../testresults";
import { type ITestRunsService, TestRunId, AutotestResult, TestRunGet } from "./testruns.type";
import { type ITestRunConverter, TestRunConverter } from "./testruns.converter";
import { TestRunErrorHandler } from "./testruns.handler";
import logger from "../../logger";

export class TestRunsService extends BaseService implements ITestRunsService {
  protected _client;
  protected _converter: ITestRunConverter;
  private readonly _testResults: TestResultsService;
  /** testResultId by autoTestExternalId within current run (InProgress POST + search). */
  private readonly testResultIdsByExternalId = new Map<string, string>();

  constructor(protected readonly config: AdapterConfig) {
    super(config);
    this._client = new TestitApiClient.TestRunsApi();
    this._converter = new TestRunConverter(config);
    this._testResults = new TestResultsService(config);
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
        logger.error("Error in createTestRun:", err);
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
        logger.log("Full response from updateEmpty:", response);
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
    await this.sendAutotestResultWithRetry(testRunId, model);
    logTmsLoadTestRun("POST setAutoTestResults (InProgress stub) done", {
      autoTestExternalId: model.autoTestExternalId,
    });
  }

  public async loadAutotests(testRunId: string, results: Array<AutotestResult>) {
    for (const result of results) {
      const externalId = result.autoTestExternalId;
      const existingId = await this.resolveExistingTestResultId(externalId);

      if (existingId) {
        logTmsLoadTestRun("PUT updateTestResult (final)", {
          testRunId,
          autoTestExternalId: externalId,
          testResultId: existingId,
          stepCount: result.stepResults?.length ?? 0,
        });
        await this.updateAutotestResultWithRetry(existingId, result).catch((err: any) => {
          const normalized = err?.body ?? err?.error ?? err;
          logger.error("[testit-js-commons:loadTestRun] FAILED to update final result", {
            testRunId,
            autoTestExternalId: externalId,
            testResultId: existingId,
            error: normalized,
          });
        });
        continue;
      }

      const autotestResult = this._converter.toOriginAutotestResult(result);
      escapeHtmlInObject(autotestResult);
      logTmsLoadTestRun("POST setAutoTestResults (final)", {
        testRunId,
        autoTestExternalId: autotestResult.autoTestExternalId,
        statusType: autotestResult.statusType,
        statusCode: autotestResult.statusCode,
        stepCount: autotestResult.stepResults?.length ?? 0,
      });
      await this.sendAutotestResultWithRetry(testRunId, autotestResult).catch((err: any) => {
        const normalized = err?.body ?? err?.error ?? err;
        logger.error("[testit-js-commons:loadTestRun] FAILED to post final result", {
          testRunId,
          autoTestExternalId: autotestResult.autoTestExternalId,
          error: normalized,
        });
      });
    }
  }

  private async resolveExistingTestResultId(externalId: string): Promise<string | undefined> {
    const cached = this.testResultIdsByExternalId.get(externalId);
    if (cached) {
      return cached;
    }

    const found = await this._testResults.findTestResultIdByExternalId(externalId);
    if (found) {
      this.testResultIdsByExternalId.set(externalId, found);
    }
    return found;
  }

  private rememberCreatedTestResultId(externalId: string | undefined, ids: unknown): void {
    if (!externalId) {
      return;
    }
    const list = Array.isArray(ids) ? ids : ids != null ? [ids] : [];
    const id = list[0];
    if (typeof id === "string" && id.length > 0) {
      this.testResultIdsByExternalId.set(externalId, id);
    }
  }

  private async sendAutotestResultWithRetry(testRunId: string, autotestResult: any): Promise<void> {
    const ids = await withHttpRetry(
      () =>
        this._client.setAutoTestResultsForTestRun(testRunId, {
          autoTestResultsForTestRunModel: [autotestResult],
        }),
      {
        label: `setAutoTestResults:${autotestResult.autoTestExternalId}:${autotestResult.statusCode ?? autotestResult.statusType}`,
      },
    );
    this.rememberCreatedTestResultId(autotestResult.autoTestExternalId, ids);
    logger.debug("[testruns] setAutoTestResults ok", {
      testRunId,
      autoTestExternalId: autotestResult.autoTestExternalId,
      statusCode: autotestResult.statusCode,
      statusType: autotestResult.statusType,
      testResultId: this.testResultIdsByExternalId.get(autotestResult.autoTestExternalId),
    });
  }

  private async updateAutotestResultWithRetry(testResultId: string, result: AutotestResult): Promise<void> {
    const model = this._converter.toOriginTestResultUpdate(result);
    escapeHtmlInObject(model);
    await withHttpRetry(
      () => this._testResults.updateTestResult(testResultId, model),
      { label: `updateTestResult:${result.autoTestExternalId}` },
    );
    logger.debug("[testruns] updateTestResult ok", {
      testResultId,
      autoTestExternalId: result.autoTestExternalId,
    });
  }
}
