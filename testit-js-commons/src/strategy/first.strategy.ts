import { AdapterConfig } from "../common";
import { BaseStrategy } from "./base.strategy";
import { IStrategy } from "./strategy.type";

export class FirstStrategy extends BaseStrategy implements IStrategy {
  constructor(config: AdapterConfig) {
    super(config);
    if (!config.testRunId) throw new Error("testRunId is required when mode is 1");
    this.updateTestRun(config);
  }
}
