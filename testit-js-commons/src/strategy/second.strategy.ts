import { AdapterConfig } from "../common";
import { IStrategy } from "./strategy.type";
import { TestRunId } from "../services";
import { BaseStrategy } from "./base.strategy";

export class SecondStrategy extends BaseStrategy implements IStrategy {
  testRunId: Promise<TestRunId>;

  constructor(config: AdapterConfig) {
    super(config);
    this.testRunId = this.client.testRuns.createTestRun();
  }
}
