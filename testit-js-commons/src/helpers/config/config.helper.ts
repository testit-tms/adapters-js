import * as dotenv from "dotenv";
import { Utils, AdapterConfig, EnvironmentOptions } from "../../common";
import { IConfigComposer } from "./config.type";

export const DEFAULT_CONFIG_FILE = "tms.config.json";

export class ConfigComposer implements IConfigComposer {
  public compose(base?: Partial<AdapterConfig>): AdapterConfig {
    const environment: Partial<EnvironmentOptions> | undefined = parseEnvConfig();
    const content: string = Utils.readFile(environment?.TMS_CONFIG_FILE ?? DEFAULT_CONFIG_FILE);

    if (content !== "") {
      const config: AdapterConfig = JSON.parse(content);

      if (config.privateToken) {
        console.warn(`
        The configuration file specifies a private token. It is not safe. 
        Use TMS_PRIVATE_TOKEN environment variable`);
      }

      return this.mergeAll(config, environment, base);
    }

    return this.merge(environment, base);
  }

  public mergeAll(file: AdapterConfig, env?: Partial<EnvironmentOptions>, base?: Partial<AdapterConfig>): AdapterConfig {
    return {
      url: this.resolveAllProperties(file.url, env?.TMS_URL, base?.url),
      projectId: this.resolveAllProperties(file.projectId, env?.TMS_PROJECT_ID, base?.projectId),
      testRunId: this.resolveAllProperties(file.testRunId, env?.TMS_TEST_RUN_ID, base?.testRunId),
      testRunName: this.resolveAllProperties(file.testRunName, env?.TMS_TEST_RUN_NAME, base?.testRunName) == "" ? undefined : this.resolveAllProperties(file.testRunName, env?.TMS_TEST_RUN_NAME, base?.testRunName),
      privateToken: this.resolveAllProperties(file.privateToken, env?.TMS_PRIVATE_TOKEN, base?.privateToken),
      adapterMode: file.adapterMode ?? env?.TMS_ADAPTER_MODE ?? base?.adapterMode ?? 0,
      configurationId: this.resolveAllProperties(file.configurationId, env?.TMS_CONFIGURATION_ID, base?.configurationId),
      automaticCreationTestCases: file.automaticCreationTestCases ?? env?.TMS_AUTOMATIC_CREATION_TEST_CASES ?? base?.automaticCreationTestCases ?? false,
      certValidation: file.certValidation ?? env?.TMS_CERT_VALIDATION ?? base?.certValidation ?? true
    };
  }

  public merge(env?: Partial<EnvironmentOptions>, base?: Partial<AdapterConfig>): AdapterConfig {
    return {
      url: this.resolveProperties(env?.TMS_URL, base?.url),
      projectId: this.resolveProperties( env?.TMS_PROJECT_ID, base?.projectId),
      testRunId: this.resolveProperties(env?.TMS_TEST_RUN_ID, base?.testRunId),
      testRunName: this.resolveProperties(env?.TMS_TEST_RUN_NAME, base?.testRunName) == "" ? undefined : this.resolveProperties(env?.TMS_TEST_RUN_NAME, base?.testRunName),
      privateToken: this.resolveProperties(env?.TMS_PRIVATE_TOKEN, base?.privateToken),
      adapterMode: base?.adapterMode ?? env?.TMS_ADAPTER_MODE ?? 0,
      configurationId: this.resolveProperties(env?.TMS_CONFIGURATION_ID, base?.configurationId),
      automaticCreationTestCases: env?.TMS_AUTOMATIC_CREATION_TEST_CASES ?? base?.automaticCreationTestCases ?? false,
      certValidation: env?.TMS_CERT_VALIDATION ?? base?.certValidation ?? true
    };
  }

  private resolveAllProperties(file?: string, env?: string, base?: string) : string {
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

  private resolveProperties(env?: string, base?: string) : string {
    if (base && base.trim()) {
      return base;
    }
    else if (env && env.trim()) {
      return env;
    }
    else {
      return "";
    }
  }
}

function parseEnvConfig(): Partial<EnvironmentOptions> | undefined {
  return dotenv.config({ path: ".env" }).parsed;
}
