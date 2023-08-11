import { IClient } from "../client";
import { AdapterConfig } from "../common";
import { IStrategy } from "./strategy.type";
import { TestRunId } from "../services";
import { BaseStrategy } from "./base.strategy";

export class SecondStrategy extends BaseStrategy implements IStrategy {
  testRunId: Promise<TestRunId>;

  constructor(client: IClient, config: AdapterConfig) {
    super(client, config);
    this.testRunId = client.testRuns.createTestRun();
  }
}
