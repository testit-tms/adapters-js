import { Client, IClient } from "../client";
import { AdapterConfig } from "../common";
import { logTmsLoadTestRun } from "../common/utils";
import { AutotestPost, AutotestResult, TestRunId } from "../services";
import { SyncStorageRunner, toTestResultCutModel } from "../services/syncstorage";
import { IStrategy } from "./strategy.type";

export class BaseStrategy implements IStrategy {
  client: IClient;
  testRunId: Promise<TestRunId>;
  private syncStorageRunner?: SyncStorageRunner;
  private deferredFirstFinalResult?: AutotestResult;
  private checkedExistingInProgress = false;
  private hasExistingInProgress = false;

  protected constructor(protected config: AdapterConfig) {
    this.client = new Client(config);
    this.testRunId = Promise.resolve(config.testRunId);
  }

  async setup(): Promise<void> {
    const testRunId = await this.testRunId;
    await this.tryStartSyncStorage(testRunId);
    await this.syncStorageRunner?.setWorkerStatus("in_progress");
    await this.client.testRuns.startTestRun(testRunId);
  }

  async teardown(): Promise<void> {
    const testRunId = await this.testRunId;
    await this.syncStorageRunner?.setWorkerStatus("completed");
    await this.syncStorageRunner?.completeProcessing();
    // If we created an InProgress placeholder for the first result, send its final payload only
    // after completion processing, so TMS shows InProgress during the run.
    if (this.deferredFirstFinalResult) {
      // logTmsLoadTestRun("flush deferred first final result", {
      //   testRunId,
      //   autoTestExternalId: this.deferredFirstFinalResult.autoTestExternalId,
      // });
      // await this.client.testRuns.loadAutotests(testRunId, [this.deferredFirstFinalResult]);
      // this.deferredFirstFinalResult = undefined;
    }
    // await this.client.testRuns.completeTestRun(testRunId);
  }

  async loadAutotest(autotest: AutotestPost, status: string): Promise<void> {
    await this.client.autoTests.loadAutotest(autotest, status);

    if (Array.isArray(autotest.workItemIds)) {
      await this.updateTestLinkToWorkItems(autotest.externalId, autotest.workItemIds);
    }
  }

  private async updateTestLinkToWorkItems(externalId: string, workItemIds: Array<string>): Promise<void> {
    const existingAutotest = await this.client.autoTests.getAutotestByExternalId(externalId).then((test) => test?.id);

    if (existingAutotest === undefined) {
      throw new Error(`Autotest with external id ${externalId} not found`);
    }

    const linkedWorkItems = await this.client.autoTests.getWorkItemsLinkedToAutoTest(existingAutotest);

    // Проверяем, является ли linkedWorkItems массивом, если нет - делаем его массивом
    const workItemsArray = Array.isArray(linkedWorkItems) ? linkedWorkItems : linkedWorkItems ? [linkedWorkItems] : [];

    for (const linkedWorkItem of workItemsArray) {
      const linkedWorkItemId = linkedWorkItem.globalId.toString();

      if (workItemIds.includes(linkedWorkItemId)) {
        // Правильно удаляем элемент из массива
        const index = workItemIds.indexOf(linkedWorkItemId);
        if (index > -1) {
          workItemIds.splice(index, 1);
        }

        continue;
      }

      if (this.config.automaticUpdationLinksToTestCases) {
        await this.client.autoTests.unlinkToWorkItem(existingAutotest, linkedWorkItemId);
      }
    }

    await this.client.autoTests.linkToWorkItems(existingAutotest, workItemIds).catch((err) => {
      console.log("Failed link work items. \n", err);
    });
  }

  async loadTestRun(autotests: AutotestResult[]): Promise<void> {
    const testRunId = await this.testRunId;
    const firstResult = autotests[0];
    logTmsLoadTestRun("loadTestRun enter", {
      testRunId,
      batchSize: autotests.length,
      firstExternalId: firstResult?.autoTestExternalId,
      syncRunnerActive: Boolean(this.syncStorageRunner?.isActive?.()),
      isMaster: Boolean(this.syncStorageRunner?.isMasterWorker?.()),
    });

    // InProgress is only for the first result (the one used for sync storage cut).
    // Its final payload is deferred until teardown, so TMS does not immediately flip to final status.
    if (firstResult && !this.deferredFirstFinalResult) {
      const isMasterWorker = Boolean(this.syncStorageRunner?.isMasterWorker?.());
      const published = await this.syncStorageRunner?.sendInProgressTestResult(
        toTestResultCutModel(firstResult, this.config.projectId),
      );
      logTmsLoadTestRun("syncStorage sendInProgressTestResult", {
        isMasterWorker,
        published: Boolean(published),
      });
      const shouldPostInProgress = await this.shouldPostInProgressStub(isMasterWorker);
      if (!shouldPostInProgress) {
        logTmsLoadTestRun("skip InProgress stub: current worker is not sync master and fallback already satisfied");
        await this.client.testRuns.loadAutotests(testRunId, autotests);
        return;
      }
      try {
        await this.client.testRuns.postInProgressAutotestResult(testRunId, firstResult);
      } catch (err: unknown) {
        logTmsLoadTestRun("postInProgressAutotestResult FAILED", {
          autoTestExternalId: firstResult.autoTestExternalId,
          message: err instanceof Error ? err.message : String(err),
        });
        throw err;
      }
      this.deferredFirstFinalResult = firstResult;

      const rest = autotests.slice(1);
      if (rest.length > 0) {
        await this.client.testRuns.loadAutotests(testRunId, rest);
      }
      return;
    }

    // Normal path: no placeholder created here — upload finals as-is.
    await this.client.testRuns.loadAutotests(testRunId, autotests);
  }

  private async shouldPostInProgressStub(isMasterWorker: boolean): Promise<boolean> {
    if (isMasterWorker) {
      return true;
    }

    // Jest workers may all have isMaster=false in local context. Fallback: allow one non-master
    // worker to create the initial TMS InProgress stub if none exists yet in this run.
    if (!this.checkedExistingInProgress) {
      const inProgressExternalIds = await this.client.testResults.getExternalIdsForRun();
      this.hasExistingInProgress = inProgressExternalIds.length > 0;
      this.checkedExistingInProgress = true;
      logTmsLoadTestRun("checked existing InProgress results in TMS", {
        count: inProgressExternalIds.length,
      });
    }

    return !this.hasExistingInProgress;
  }

  private async tryStartSyncStorage(testRunId: string): Promise<void> {
    if (!this.config.syncStorageEnabled) {
      return;
    }

    const runner = new SyncStorageRunner(testRunId, this.config);
    const started = await runner.start();
    if (!started) {
      return;
    }

    this.syncStorageRunner = runner;
  }

  protected async updateTestRun(config: AdapterConfig): Promise<void> {
    const testRunId = config.testRunId;

    if (config.testRunName == undefined) {
      return;
    }

    const testRun = await this.client.testRuns.getTestRun(testRunId);

    if (config.testRunName == testRun.name) {
      return;
    }

    testRun.name = config.testRunName;

    this.client.testRuns.updateTestRun(testRun);
  }
}
