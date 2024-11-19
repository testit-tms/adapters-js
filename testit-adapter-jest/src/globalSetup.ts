import { Config } from "@jest/reporters";
import { ConfigComposer, StrategyFactory } from "testit-js-commons";

export default async (globalConfig: Config.GlobalConfig, projectConfig: Config.ProjectConfig) => {
  const config = new ConfigComposer().compose(projectConfig.testEnvironmentOptions);
  const strategy = StrategyFactory.create(config);

  await strategy.setup();
  const testRunId = await strategy.testRunId;

  projectConfig.globals["testRunId"] = testRunId;
  globalThis.strategy = strategy;
};
