import { Config } from '@jest/reporters';

export default async (
  globalConfig: Config.GlobalConfig,
  projectConfig: Config.ProjectConfig
) => {
  try {
    await globalThis.strategy.teardown();
  } catch (err) {
    console.error('Failed to complete test run');
  }
};
