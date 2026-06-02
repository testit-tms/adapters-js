import { Config } from '@jest/reporters';
import { logger } from "testit-js-commons";


export default async (
  globalConfig: Config.GlobalConfig,
  projectConfig: Config.ProjectConfig
) => {
  try {
    if (globalThis.strategy) {
      await globalThis.strategy.teardown();
    }
  } catch (err) {
    logger.error('Failed to complete test run');
  }
};
