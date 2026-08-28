// eslint-disable-next-line @typescript-eslint/no-var-requires
const AdaptersApi = require("../../adapters-api/dist/index");
import { AdapterConfig, BaseService } from "../../common";
import { escapeHtmlInObject, escapeHtmlInObjectArray, logTmsLoadTestRun, withHttpRetry } from "../../common/utils";
import { TestResultsService } from "../testresults";
import { type ITestRunsService, TestRunId, AutotestResult, TestRunGet } from "./testruns.type";
import { type ITestRunConverter, TestRunConverter } from "./testruns.converter";
import { TestRunErrorHandler } from "./testruns.handler";
import logger from "../../logger";

export class TestRunsService extends BaseService implements ITestRunsService {
  protected _client: any;
  protected _converter: ITestRunConverter;
  private readonly _testResults: TestResultsService;
  /** Finalized via POST setAutoTestResults in this process (skip duplicate bulk send). */
  private readonly finalizedExternalIds = new Set<string>();
  /** testResultId by autoTestExternalId within current run (InProgress POST + final POST). */
  private readonly testResultIdsByExternalId = new Map<string, string>();

  constructor(protected readonly config: AdapterConfig) {
    super(config);
    this._client = new AdaptersApi.TestRunsApi(AdaptersApi.ApiClient.instance);
    this._converter = new TestRunConverter(config);
    this._testResults = new TestResultsService(config);
  }

  public async createTestRun(): Promise<TestRunId> {
    const tags = this.config.testRunTags;
    const links = this.config.testRunLinks?.map((link) => this._converter.toOriginLink(link));
    const createRequest: Record<string, unknown> = {
      projectId: this.config.projectId,
      name: this.config.testRunName,
    };
    if (tags?.length) {
      createRequest.tags = tags;
    }
    if (links?.length) {
      createRequest.links = links;
    }

    return await this._client
      .adaptersTestRunsPost({ createEmptyTestRunApiModel: escapeHtmlInObject(createRequest) })
      // @ts-ignore
      .then((response) => {
        const data = response?.body || response;
        if (!data) {
          throw new Error("API returned undefined response");
        }
        if (!data.id) {
          throw new Error("API response missing 'id' field: " + JSON.stringify(data));
        }
        this.config.testRunId = data.id;
        logger.log(
          `Create test run "${data.id}"` +
            (tags?.length ? ` tags=[${tags.join(",")}]` : "") +
            (links?.length ? ` links=${links.length}` : "")
        );
        return data.id;
      })
      .catch((err: any) => {
        logger.error("Error in createTestRun:", err);
        throw err;
      });
  }

  public async getTestRun(testRunId: TestRunId): Promise<TestRunGet> {
    return await this._client
      .adaptersTestRunsIdGet(testRunId)
      // @ts-ignore
      .then((response) => {
        const data = response?.body || response;
        return data;
      })
      // @ts-ignore
      .then((run) => this._converter.toLocalTestRun(run));
  }

  public async updateTestRun(testRun: TestRunGet): Promise<void> {
    const updateModel = {
      id: testRun.id,
      name: testRun.name,
      description: testRun.description,
      launchSource: testRun.launchSource,
      attachments: testRun.attachments?.map((a) => ({ id: a.id })),
      tags: testRun.tags,
      links: testRun.links?.map((link) =>
        this._converter.toOriginLink({
          url: link.url,
          title: link.title ?? link.url,
          description: link.description ?? undefined,
          type: (link as { type?: string }).type as any,
        })
      ),
    };

    await this._client
      .adaptersTestRunsPut({ updateEmptyTestRunApiModel: escapeHtmlInObject(updateModel) })
      // @ts-ignore
      .then((response) => {
        logger.log("Full response from adaptersTestRunsPut:", response);
        const data = response?.body || response;
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
        await this._client.adaptersTestRunsIdStartPost(testRunId);
      }
    } catch (err) {
      TestRunErrorHandler.handleErrorStartTestRun(err);
    }
  }

  public async completeTestRun(testRunId: TestRunId): Promise<void> {
    try {
      const testRun = await this.getTestRun(testRunId);
      if (testRun.stateName === "InProgress") {
        await this._client.adaptersTestRunsIdCompletePost(testRunId);
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

      if (this.finalizedExternalIds.has(externalId)) {
        logTmsLoadTestRun("Bulk import: skip sendTestResults (already finalized)", {
          testRunId,
          autoTestExternalId: externalId,
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
      await this.sendAutotestResultWithRetry(testRunId, autotestResult)
        .then(() => {
          this.finalizedExternalIds.add(externalId);
          logTmsLoadTestRun("Finalized test result via sendTestResults", {
            testRunId,
            autoTestExternalId: externalId,
            testResultId: this.testResultIdsByExternalId.get(externalId),
          });
        })
        .catch((err: any) => {
          const normalized = err?.body ?? err?.error ?? err;
          logger.error("[testit-js-commons:loadTestRun] FAILED to post final result", {
            testRunId,
            autoTestExternalId: autotestResult.autoTestExternalId,
            error: normalized,
          });
        });
    }
  }

  public async updateSetupTeardown(results: Array<AutotestResult>): Promise<void> {
    for (const result of results) {
      const hasSetup = Boolean(result.setupResults?.length);
      const hasTeardown = Boolean(result.teardownResults?.length);
      if (!hasSetup && !hasTeardown) {
        continue;
      }

      const testResultId = await this.resolveExistingTestResultId(result.autoTestExternalId);
      if (!testResultId) {
        logger.warn("[testruns] skip setup/teardown PUT: test result id not found", {
          autoTestExternalId: result.autoTestExternalId,
        });
        continue;
      }

      const model = this._converter.toOriginSetupTeardownUpdate(result);
      if (!model.setupResults?.length && !model.teardownResults?.length) {
        continue;
      }

      escapeHtmlInObject(model);
      logTmsLoadTestRun("PUT updateTestResult (setup/teardown only)", {
        autoTestExternalId: result.autoTestExternalId,
        testResultId,
        setupCount: model.setupResults?.length ?? 0,
        teardownCount: model.teardownResults?.length ?? 0,
      });
      await this.updateSetupTeardownWithRetry(testResultId, result, model).catch((err: unknown) => {
        logger.error("[testit-js-commons:loadTestRun] FAILED to update setup/teardown", {
          autoTestExternalId: result.autoTestExternalId,
          testResultId,
          error: (err as { body?: unknown })?.body ?? err,
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
        this._client.adaptersTestRunsIdTestResultsPost(testRunId, {
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

  private async updateSetupTeardownWithRetry(
    testResultId: string,
    result: AutotestResult,
    model: Record<string, unknown>,
  ): Promise<void> {
    await withHttpRetry(
      () => this._testResults.updateTestResult(testResultId, model),
      { label: `updateSetupTeardown:${result.autoTestExternalId}` },
    );
    logger.debug("[testruns] updateSetupTeardown ok", {
      testResultId,
      autoTestExternalId: result.autoTestExternalId,
    });
  }
}
