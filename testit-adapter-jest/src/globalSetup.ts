import { Config } from "@jest/reporters";
import { Client, ConfigComposer, StrategyFactory } from "testit-js-commons";

export default async (globalConfig: Config.GlobalConfig, projectConfig: Config.ProjectConfig) => {
  const config = new ConfigComposer().compose(projectConfig.testEnvironmentOptions);
  const client = new Client(config);
  const strategy = StrategyFactory.create(client, config);

  await strategy.setup();
  const testRunId = await strategy.testRunId;

  globalThis.client = client;

  projectConfig.globals["testRunId"] = testRunId;
};
