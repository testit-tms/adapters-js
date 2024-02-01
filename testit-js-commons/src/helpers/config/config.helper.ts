import * as dotenv from "dotenv";
import { Utils, AdapterConfig, EnvironmentOptions } from "../../common";
import { IConfigComposer } from "./config.type";

export const DEFAULT_CONFIG_FILE = "tms.config.json";

export class ConfigComposer implements IConfigComposer {
  public compose(base?: Partial<AdapterConfig>): AdapterConfig {
    const environment: Partial<EnvironmentOptions> | undefined = parseEnvConfig();
    const content: string = Utils.readFile(environment?.TMS_CONFIG_FILE ?? DEFAULT_CONFIG_FILE);
    const config: AdapterConfig = JSON.parse(content);

    if (config.privateToken) {
      console.warn(`
        The configuration file specifies a private token. It is not safe. 
        Use TMS_PRIVATE_TOKEN environment variable
      `);
    }

    return this.merge(config, environment, base);
  }

  public merge(file: AdapterConfig, env?: Partial<EnvironmentOptions>, base?: Partial<AdapterConfig>): AdapterConfig {
    return {
      url: base?.url ?? env?.TMS_URL ?? file.url,
      projectId: base?.projectId ?? env?.TMS_PROJECT_ID ?? file.projectId,
      testRunId: base?.testRunId ?? env?.TMS_TEST_RUN_ID ?? file.testRunId,
      testRunName: base?.testRunName ?? env?.TMS_TEST_RUN_NAME ?? file.testRunName,
      privateToken: base?.privateToken ?? env?.TMS_PRIVATE_TOKEN ?? file.privateToken,
      adapterMode: base?.adapterMode ?? env?.TMS_ADAPTER_MODE ?? file.adapterMode ?? 0,
      configurationId: base?.configurationId ?? env?.TMS_CONFIGURATION_ID ?? file.configurationId,
      automaticCreationTestCases:
        base?.automaticCreationTestCases ??
        env?.TMS_AUTOMATIC_CREATION_TEST_CASES ??
        file.automaticCreationTestCases ??
        false,
    };
  }
}

function parseEnvConfig(): Partial<EnvironmentOptions> | undefined {
  return dotenv.config({ path: ".env" }).parsed;
}
