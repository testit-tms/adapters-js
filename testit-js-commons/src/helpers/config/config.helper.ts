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
      url: this.resolveProperty(file.url, env?.TMS_URL, base?.url),
      projectId: this.resolveProperty(file.projectId, env?.TMS_PROJECT_ID, base?.projectId),
      testRunId: this.resolveProperty(file.testRunId, env?.TMS_TEST_RUN_ID, base?.testRunId),
      testRunName: this.resolveProperty(file.testRunName, env?.TMS_TEST_RUN_NAME, base?.testRunName) == ""
        ? undefined
        : this.resolveProperty(file.testRunName, env?.TMS_TEST_RUN_NAME, base?.testRunName),
      privateToken: this.resolveProperty(file.privateToken, env?.TMS_PRIVATE_TOKEN, base?.privateToken),
      adapterMode: base?.adapterMode ?? env?.TMS_ADAPTER_MODE ?? file.adapterMode ?? 0,
      configurationId: this.resolveProperty(file.configurationId, env?.TMS_CONFIGURATION_ID, base?.configurationId),
      automaticCreationTestCases:
        base?.automaticCreationTestCases ??
        env?.TMS_AUTOMATIC_CREATION_TEST_CASES ??
        file.automaticCreationTestCases ??
        false,
    };
  }

  private resolveProperty(file?: string, env?: string, base?: string) : string {
    if (base && base.trim()) {
      return base;
    }
    else if (env && env.trim()) {
      return env;
    }
    else if (file && file.trim()) {
      return file;
    }
    else {
      return "";
    }
  }
}

function parseEnvConfig(): Partial<EnvironmentOptions> | undefined {
  return dotenv.config({ path: ".env" }).parsed;
}
