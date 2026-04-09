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
    await this.client.testRuns.completeTestRun(testRunId);
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

    // Per autotest: TMS InProgress then final. Jest sends one batch (N>1); only the first had InProgress before.
    // Playwright sends [one] per call — same loop. Sync Storage cut stays single (master), first test only.
    for (let i = 0; i < autotests.length; i++) {
      const result = autotests[i];
      if (i === 0) {
        const published = await this.syncStorageRunner?.sendInProgressTestResult(
          toTestResultCutModel(result, this.config.projectId),
        );
        logTmsLoadTestRun("syncStorage sendInProgressTestResult", { published: Boolean(published) });
      }
      try {
        await this.client.testRuns.postInProgressAutotestResult(testRunId, result);
      } catch (err: unknown) {
        logTmsLoadTestRun("postInProgressAutotestResult FAILED", {
          autoTestExternalId: result.autoTestExternalId,
          message: err instanceof Error ? err.message : String(err),
        });
        throw err;
      }
      await this.client.testRuns.loadAutotests(testRunId, [result]);
    }
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
