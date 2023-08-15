import { Config } from '@jest/reporters';

export default async (
  globalConfig: Config.GlobalConfig,
  projectConfig: Config.ProjectConfig
) => {
  const testRunId = projectConfig.globals['testRunId'] as string;

  if (!testRunId) {
    return console.error('Looks like globalSetup was not called');
  }

  try {
    await globalThis.client.testRuns.completeTestRun(testRunId);
  } catch (err) {
    console.error('Failed to complete test run');
  }
};
