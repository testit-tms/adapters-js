import { IClient } from "../client";
import { AdapterConfig } from "../common";
import { AutotestResultGet } from "../services";
import { IStrategy } from "./strategy.type";
import { BaseStrategy } from "./base.strategy";

export class ZeroStrategy extends BaseStrategy implements IStrategy {
  readonly testsInRun: Promise<AutotestResultGet[] | undefined>;

  constructor(client: IClient, config: AdapterConfig) {
    super(client, config);
    if (!config.testRunId) throw new Error("testRunId is required when mode is 0");
    this.testsInRun = client.testRuns.getAutotests(config.testRunId);
  }
}
