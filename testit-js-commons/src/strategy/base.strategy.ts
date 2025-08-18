import { Client, IClient } from "../client";
import { AdapterConfig } from "../common";
import { AutotestPost, AutotestResult, TestRunId, Status } from "../services";
import { IStrategy } from "./strategy.type";

export class BaseStrategy implements IStrategy {
  client: IClient;
  testRunId: Promise<TestRunId>;
  
  protected constructor(protected config: AdapterConfig) {
    this.client = new Client(config);
    this.testRunId = Promise.resolve(config.testRunId);
  }

  async setup(): Promise<void> {
    const testRunId = await this.testRunId;
    await this.client.testRuns.startTestRun(testRunId);
  }

  async teardown(): Promise<void> {
    const testRunId = await this.testRunId;
    await this.client.testRuns.completeTestRun(testRunId);
  }

  async loadAutotest(autotest: AutotestPost, status: Status): Promise<void> {
    await this.client.autoTests.loadAutotest(autotest, status);

    if (Array.isArray(autotest.workItemIds)) {
      await this.updateTestLinkToWorkItems(autotest.externalId, autotest.workItemIds);
    }
  }

  private async updateTestLinkToWorkItems(externalId: string, workItemIds: Array<string>): Promise<void> {
    const internalId = await this.client.autoTests.getAutotestByExternalId(externalId).then((test) => test?.id);

    if (internalId === undefined) {
      throw new Error(`Autotest with external id ${internalId} not found`);
    }

    const linkedWorkItems = await this.client.autoTests.getWorkItemsLinkedToAutoTest(internalId);

    for (const linkedWorkItem of linkedWorkItems) {
        const linkedWorkItemId = linkedWorkItem.globalId.toString();

        if (workItemIds.includes(linkedWorkItemId)) {
            delete workItemIds[workItemIds.indexOf(linkedWorkItemId)];

            continue;
        }

        if (this.config.automaticUpdationLinksToTestCases) {
          await this.client.autoTests.unlinkToWorkItem(internalId, linkedWorkItemId);
        }
    }

    await this.client.autoTests.linkToWorkItems(internalId, workItemIds).catch((err) => {
      console.log("Failed link work items. \n", err);
    });
  }

  async loadTestRun(autotests: AutotestResult[]): Promise<void> {
    const testRunId = await this.testRunId;
    return await this.client.testRuns.loadAutotests(testRunId, autotests);
  }
}
