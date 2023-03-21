import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { Origin } from '../../types/origin.type';
import { Logger } from './logger.class';

const DEFAULT_CONFIG_NAME = 'testit-adapter.config.json';

export class ConfigComposer {
  //TODO: Поставлять логгер через зависимости
  private readonly logger = new Logger();

  public compose(base?: Origin.Config): Origin.Config {
    const environment: Origin.EnvironmentsConfig = dotenv.config().parsed;
    const from = environment?.TMS_CONFIG_FILE ?? DEFAULT_CONFIG_NAME;

    const buffer = fs
      .readFileSync(from)
      .toString();

    const file: Partial<Origin.Config> = JSON.parse(buffer);

    if (file?.privateToken || base?.privateToken) {
      console.warn(`
        The configuration file specifies a private token. It is not safe. 
        Use TMS_PRIVATE_TOKEN environment variable
      `);
    }

    return this.merge(base, file, environment)
  }

  private merge(
    base: Partial<Origin.Config>,
    file: Origin.Config,
    environment: Origin.EnvironmentsConfig
  ): Origin.Config {

    return {
      url: environment?.TMS_URL ?? file.url ?? base?.url,
      privateToken: environment?.TMS_PRIVATE_TOKEN ?? file?.privateToken ?? base?.url,
      projectId: environment?.TMS_PROJECT_ID ?? file?.projectId ?? base?.projectId,
      configurationId: environment?.TMS_CONFIGURATION_ID ?? file?.configurationId ?? base?.configurationId,
      testRunId: environment?.TMS_TEST_RUN_ID ?? file?.testRunId ?? base?.testRunId,
      testRunName: environment?.TMS_TEST_RUN_NAME ?? file?.testRunName ?? base?.testRunName,
      adapterMode: environment?.TMS_ADAPTER_MODE ?? file?.adapterMode ?? base?.adapterMode ?? 0,
      automaticCreationTestCases: 
        environment?.TMS_AUTOMATIC_CREATION_TEST_CASES ?? 
          file?.automaticCreationTestCases ?? 
            base?.automaticCreationTestCases ?? false,
      certValidation: environment?.TMS_CERT_VALIDATION ?? file?.certValidation ?? base?.certValidation ?? true,
      __DEV: file.__DEV ?? false
    }
  }
}
