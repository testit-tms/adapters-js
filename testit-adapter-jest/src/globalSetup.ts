import { Config } from '@jest/reporters';
import { HttpError } from 'testit-api-client';
import { TestClient } from './testClient';
import { formatError } from './utils';

export default async (
  globalConfig: Config.GlobalConfig,
  projectConfig: Config.ProjectConfig
) => {
  const adapterMode = projectConfig.testEnvironmentOptions?.adapterMode ?? 0;
  const automaticCreationTestCases = projectConfig.testEnvironmentOptions?.automaticCreationTestCases ?? false;
  const certValidation = projectConfig.testEnvironmentOptions?.certValidation ?? true;

  let testRunId: string;
  try {
    switch (adapterMode) {
      case 0:
      case 1: {
        testRunId = projectConfig.testEnvironmentOptions?.testRunId as string;
        if (!testRunId) {
          throw new Error('testRunId is required when mode is 1');
        }
        globalThis.testClient = new TestClient(
          projectConfig.testEnvironmentOptions
        );
        break;
      }
      case 2: {
        globalThis.testClient = new TestClient(
          projectConfig.testEnvironmentOptions
        );
        testRunId = await globalThis.testClient.createTestRun();
        break;
      }
      default:
        throw new Error(`Unknown adapter mode ${adapterMode}`);
    }
  } catch (err) {
    console.error('Failed to setup', formatError(err as HttpError));
    process.exit(1);
  }
  projectConfig.globals['testRunId'] = testRunId;
  projectConfig.globals['automaticCreationTestCases'] = automaticCreationTestCases;
  projectConfig.globals['certValidation'] = certValidation;
};