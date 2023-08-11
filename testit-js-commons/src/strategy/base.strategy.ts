import { IClient } from "../client";
import { AdapterConfig } from "../common";
import { AutotestPost, AutotestResult } from "../services";
import { IStrategy } from "./strategy.type";

export class BaseStrategy implements IStrategy {
  testRunId: Promise<string>;

  protected constructor(protected client: IClient, protected config: AdapterConfig) {
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

  async loadAutotest(autotest: AutotestPost, isPassed: boolean): Promise<void> {
    await this.client.autoTests.loadAutotest(autotest, isPassed);

    if (Array.isArray(autotest.workItemIds)) {
      this.client.autoTests.linkToWorkItems(autotest.externalId, autotest.workItemIds).catch((err) => {
        console.log("Failed link work items. \n", err);
      });
    }
  }

  async loadTestRun(autotests: AutotestResult[]): Promise<void> {
    const testRunId = await this.testRunId;
    return this.client.testRuns.loadAutotests(testRunId, autotests);
  }
}
