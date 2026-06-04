import { Config } from "@jest/reporters";
import { ConfigComposer, StrategyFactory } from "testit-js-commons";
import { logger } from "testit-js-commons";


const globalUnhandledRejectionLogger = (reason: unknown) => {
  const normalized = (reason as any)?.body ?? (reason as any)?.error ?? reason;
  logger.error("[jest-globalSetup] unhandledRejection:", normalized);
};

export default async (globalConfig: Config.GlobalConfig, projectConfig: Config.ProjectConfig) => {
  process.on("unhandledRejection", globalUnhandledRejectionLogger);
  try {
    const config = new ConfigComposer().compose(projectConfig.testEnvironmentOptions);
    const strategy = StrategyFactory.create(config);

    // Do not run setup in globalSetup: Jest workers run in separate processes and would then
    // send results from non-master contexts. Let each worker environment run setup locally.
    const testRunId = await strategy.testRunId;

    projectConfig.testEnvironmentOptions["testRunId"] = testRunId;
    projectConfig.testEnvironmentOptions["adapterMode"] = 1;
  } catch (err: any) {
    logger.error("Failed globalSetup for testit-adapter-jest:", err?.body ?? err?.error ?? err);
  }
};
