import { Client, IClient } from "../client";
import { AdapterConfig, Link } from "../common";
import { logTmsLoadTestRun } from "../common/utils";
import { mergeLinkLists, mergeTagLists } from "../helpers/config/test-run-metadata.util";
import { AutotestPost, AutotestResult, LinkGet, TestRunId } from "../services";
import { SyncStorageRunner, toTestResultCutModel } from "../services/syncstorage";
import { IStrategy } from "./strategy.type";
import logger from "../logger";

export class BaseStrategy implements IStrategy {
  private static readonly INPROGRESS_FIRST_GRACE_MS = 3000;
  client: IClient;
  testRunId: Promise<TestRunId>;
  private syncStorageRunner?: SyncStorageRunner;

  protected constructor(protected config: AdapterConfig) {
    this.client = new Client(config);
    this.testRunId = Promise.resolve(config.testRunId);
  }

  async setup(): Promise<void> {
    const testRunId = await this.testRunId;
    await this.updateTestRun(this.config);
    await this.tryStartSyncStorage(testRunId);
    await this.syncStorageRunner?.setWorkerStatus("in_progress");
    await this.client.testRuns.startTestRun(testRunId);
  }

  async teardown(): Promise<void> {
    const testRunId = await this.testRunId;
    await this.syncStorageRunner?.setWorkerStatus("completed");
    await this.syncStorageRunner?.completeProcessing();
    // With active sync-storage, run completion is finalized by sync-storage itself.
    // Calling completeTestRun from adapters can finish the run too early and skip late results.
    // if (this.syncStorageRunner?.isActive()) {
    //   logTmsLoadTestRun("skip completeTestRun in adapter teardown: sync-storage is active");
    //   return;
    // }
    //await this.client.testRuns.completeTestRun(testRunId);
  }

  async loadAutotest(autotest: AutotestPost, status: string): Promise<void> {
    logger.debug("[strategy] loadAutotest", {
      externalId: autotest.externalId,
      status,
      setupSteps: autotest.setup?.length ?? 0,
      testSteps: autotest.steps?.length ?? 0,
      teardownSteps: autotest.teardown?.length ?? 0,
    });
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
      logger.log("Failed link work items. \n", err);
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
    if (firstResult) {
      const isMasterWorker = Boolean(this.syncStorageRunner?.isMasterWorker?.());
      const published = await this.syncStorageRunner?.sendInProgressTestResult(
        toTestResultCutModel(firstResult, this.config.projectId),
      );
      logTmsLoadTestRun("syncStorage sendInProgressTestResult", {
        isMasterWorker,
        published: Boolean(published),
      });
      if (!isMasterWorker) {
        // Global ordering: non-master waits for sync-storage published flag from master.
        const timeoutMs = this.getInProgressFirstGraceMs();
        if (timeoutMs > 0 && this.syncStorageRunner) {
          logTmsLoadTestRun("non-master wait for in-progress published", { timeoutMs });
          const publishedByMaster = await this.syncStorageRunner.waitForInProgressPublished(timeoutMs);
          logTmsLoadTestRun("non-master wait result", { publishedByMaster });
        }
        logTmsLoadTestRun("skip InProgress stub: current worker is not sync master");
        await this.client.testRuns.loadAutotests(testRunId, autotests);
        return;
      }
      if (!published) {
        logTmsLoadTestRun("skip InProgress stub: sync cut was not published");
        await this.client.testRuns.loadAutotests(testRunId, autotests);
        return;
      }
      logTmsLoadTestRun("InProgress slot acquired", {
        autoTestExternalId: firstResult.autoTestExternalId,
        testRunId,
      });
      try {
        await this.client.testRuns.postInProgressAutotestResult(testRunId, firstResult);
      } catch (err: unknown) {
        logTmsLoadTestRun("postInProgressAutotestResult FAILED", {
          autoTestExternalId: firstResult.autoTestExternalId,
          message: err instanceof Error ? err.message : String(err),
        });
        throw err;
      }

      // For published sync-storage InProgress, finalization of the first result is handled by sync-storage.
      const rest = autotests.slice(1);
      if (rest.length > 0) {
        await this.client.testRuns.loadAutotests(testRunId, rest);
      }
      return;
    }

    // Normal path: no placeholder created here — upload finals as-is.
    await this.client.testRuns.loadAutotests(testRunId, autotests);
  }

  async updateSetupTeardown(autotests: AutotestResult[]): Promise<void> {
    await this.client.testRuns.updateSetupTeardown(autotests);
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
    const testRunId = config.testRunId || (await this.testRunId);
    if (!testRunId) {
      return;
    }

    const hasName = config.testRunName != undefined;
    const hasTags = Boolean(config.testRunTags?.length);
    const hasLinks = Boolean(config.testRunLinks?.length);
    if (!hasName && !hasTags && !hasLinks) {
      return;
    }

    try {
      const testRun = await this.client.testRuns.getTestRun(testRunId);
      let changed = false;

      if (hasName && config.testRunName !== testRun.name) {
        testRun.name = config.testRunName!;
        changed = true;
      }

      if (hasTags) {
        const merged = mergeTagLists(testRun.tags, config.testRunTags);
        if (merged.length !== (testRun.tags?.length ?? 0) || merged.some((t, i) => t !== testRun.tags?.[i])) {
          testRun.tags = merged;
          changed = true;
        }
      }

      if (hasLinks) {
        const existing: LinkGet[] = testRun.links ?? [];
        const incoming: LinkGet[] = (config.testRunLinks as Link[]).map((link) => ({
          url: link.url,
          title: link.title,
          description: link.description,
          type: link.type,
          hasInfo: true,
        }));
        const merged = mergeLinkLists(existing, incoming);
        if (merged.length !== existing.length) {
          testRun.links = merged;
          changed = true;
        }
      }

      if (!changed) {
        return;
      }

      await this.client.testRuns.updateTestRun(testRun);
      logger.log(
        `Updated test run "${testRunId}"` +
          (hasTags ? ` tags=[${(testRun.tags ?? []).join(",")}]` : "") +
          (hasLinks ? ` links=${testRun.links?.length ?? 0}` : "")
      );
    } catch (err) {
      logger.error(`Failed to apply test run tags/links for "${testRunId}"`, err);
    }
  }

  private getInProgressFirstGraceMs(): number {
    const raw = process.env.TMS_SYNC_INPROGRESS_FIRST_GRACE_MS;
    if (!raw) {
      return BaseStrategy.INPROGRESS_FIRST_GRACE_MS;
    }
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed >= 0
      ? parsed
      : BaseStrategy.INPROGRESS_FIRST_GRACE_MS;
  }
}
