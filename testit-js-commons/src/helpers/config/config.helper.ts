import * as dotenv from "dotenv";
import { Utils, AdapterConfig, EnvironmentOptions, AdapterMode } from "../../common";
import { IConfigComposer } from "./config.type";

export const DEFAULT_CONFIG_FILE = "tms.config.json";

export class ConfigComposer implements IConfigComposer {
  public compose(base?: Partial<AdapterConfig>): AdapterConfig {
    const processEnvironment: Partial<EnvironmentOptions> = parseProcessEnvConfig();
    const dotEnvironment: Partial<EnvironmentOptions> | undefined = parseDotEnvConfig();
    const environment: Partial<EnvironmentOptions> = this.mergeEnv(dotEnvironment, processEnvironment);
    const content: string = Utils.readFile(dotEnvironment?.TMS_CONFIG_FILE ?? processEnvironment.TMS_CONFIG_FILE ?? DEFAULT_CONFIG_FILE);
    let config: AdapterConfig;

    if (content !== "") {
      const fileConfig: AdapterConfig = JSON.parse(content);

      if (fileConfig.privateToken) {
        console.warn(`
        The configuration file specifies a private token. It is not safe. 
        Use TMS_PRIVATE_TOKEN environment variable`);
      }

      config = this.mergeAll(fileConfig, environment, base);
    } else {
      config = this.merge(environment, base);
    }

    this.validateConfig(config);

    return config;
  }

  public mergeAll(file: AdapterConfig, env?: Partial<EnvironmentOptions>, base?: Partial<AdapterConfig>): AdapterConfig {
    return {
      url: this.resolveAllProperties(file.url, env?.TMS_URL, base?.url),
      projectId: this.resolveAllProperties(file.projectId, env?.TMS_PROJECT_ID, base?.projectId),
      testRunId: this.resolveAllProperties(file.testRunId, env?.TMS_TEST_RUN_ID, base?.testRunId),
      testRunName: this.resolveAllProperties(file.testRunName, env?.TMS_TEST_RUN_NAME, base?.testRunName) == "" ? undefined : this.resolveAllProperties(file.testRunName, env?.TMS_TEST_RUN_NAME, base?.testRunName),
      privateToken: this.resolveAllProperties(file.privateToken, env?.TMS_PRIVATE_TOKEN, base?.privateToken),
      adapterMode: base?.adapterMode ?? env?.TMS_ADAPTER_MODE ?? file?.adapterMode ?? 0,
      configurationId: this.resolveAllProperties(file.configurationId, env?.TMS_CONFIGURATION_ID, base?.configurationId),
      automaticCreationTestCases: file.automaticCreationTestCases ?? env?.TMS_AUTOMATIC_CREATION_TEST_CASES ?? base?.automaticCreationTestCases ?? false,
      certValidation: file.certValidation ?? env?.TMS_CERT_VALIDATION ?? base?.certValidation ?? true
    };
  }

  public merge(env?: Partial<EnvironmentOptions>, base?: Partial<AdapterConfig>): AdapterConfig {
    return {
      url: this.resolveProperties(env?.TMS_URL, base?.url),
      projectId: this.resolveProperties(env?.TMS_PROJECT_ID, base?.projectId),
      testRunId: this.resolveProperties(env?.TMS_TEST_RUN_ID, base?.testRunId),
      testRunName: this.resolveProperties(env?.TMS_TEST_RUN_NAME, base?.testRunName) == "" ? undefined : this.resolveProperties(env?.TMS_TEST_RUN_NAME, base?.testRunName),
      privateToken: this.resolveProperties(env?.TMS_PRIVATE_TOKEN, base?.privateToken),
      adapterMode: base?.adapterMode ?? env?.TMS_ADAPTER_MODE ?? 0,
      configurationId: this.resolveProperties(env?.TMS_CONFIGURATION_ID, base?.configurationId),
      automaticCreationTestCases: env?.TMS_AUTOMATIC_CREATION_TEST_CASES ?? base?.automaticCreationTestCases ?? false,
      certValidation: env?.TMS_CERT_VALIDATION ?? base?.certValidation ?? true
    };
  }

  public mergeEnv(dotEnv?: Partial<EnvironmentOptions>, processEnv?: Partial<EnvironmentOptions>): Partial<EnvironmentOptions> {
    return {
      TMS_URL: this.resolveProperties(dotEnv?.TMS_URL, processEnv?.TMS_URL),
      TMS_PROJECT_ID: this.resolveProperties(dotEnv?.TMS_PROJECT_ID, processEnv?.TMS_PROJECT_ID),
      TMS_TEST_RUN_ID: this.resolveProperties(dotEnv?.TMS_TEST_RUN_ID, processEnv?.TMS_TEST_RUN_ID),
      TMS_TEST_RUN_NAME: this.resolveProperties(dotEnv?.TMS_TEST_RUN_NAME, processEnv?.TMS_TEST_RUN_NAME),
      TMS_PRIVATE_TOKEN: this.resolveProperties(dotEnv?.TMS_PRIVATE_TOKEN, processEnv?.TMS_PRIVATE_TOKEN),
      TMS_ADAPTER_MODE: dotEnv?.TMS_ADAPTER_MODE ?? processEnv?.TMS_ADAPTER_MODE,
      TMS_CONFIGURATION_ID: this.resolveProperties(dotEnv?.TMS_CONFIGURATION_ID, processEnv?.TMS_CONFIGURATION_ID),
      TMS_AUTOMATIC_CREATION_TEST_CASES: dotEnv?.TMS_AUTOMATIC_CREATION_TEST_CASES ?? processEnv?.TMS_AUTOMATIC_CREATION_TEST_CASES,
      TMS_CERT_VALIDATION: dotEnv?.TMS_CERT_VALIDATION ?? processEnv?.TMS_CERT_VALIDATION
    };
  }

  private resolveAllProperties(file?: string, env?: string, base?: string): string {
    if (base && base.trim()) {
      return base;
    } else if (env && env.trim()) {
      return env;
    } else if (file && file.trim()) {
      return file;
    } else {
      return "";
    }
  }

  private resolveProperties(env?: string, base?: string): string {
    if (base && base.trim()) {
      return base;
    } else if (env && env.trim()) {
      return env;
    } else {
      return "";
    }
  }

  private validateConfig(config: AdapterConfig) {
    try {
      new URL(config.url);
    } catch (err) {
      console.error(`Url is invalid`);
    }

    if (!config.privateToken) {
      console.error(`Private Token is invalid`);
    }

    if (config.projectId.match('^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$') === null) {
      console.error(`Project ID is invalid`);
    }

    if (config.configurationId.match('^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$') === null) {
      console.error(`Configuration ID is invalid`);
    }

    if (config.adapterMode == 2) {
      if (config.testRunId.match('^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$') !== null) {
        console.error(`Adapter works in mode 2. Config should not contains test run id.`);
      }
    } else if (config.adapterMode == 1) {
      if (config.testRunId.match('^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$') === null) {
        console.error(`Adapter works in mode 1. Config should contains valid test run id.`);
      }
    } else {
      if (config.testRunId.match('^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$') === null) {
        console.error(`Adapter works in mode 0. Config should contains valid test run id.`);
      }
    }
  }
}

function parseDotEnvConfig(): Partial<EnvironmentOptions> | undefined {
  return dotenv.config({ path: ".env" }).parsed;
}

function parseProcessEnvConfig(): Partial<EnvironmentOptions> {
  return {
    TMS_URL: process.env.TMS_URL,
    TMS_PRIVATE_TOKEN: process.env.TMS_PRIVATE_TOKEN,
    TMS_PROJECT_ID: process.env.TMS_PROJECT_ID,
    TMS_CONFIGURATION_ID: process.env.TMS_CONFIGURATION_ID,
    TMS_TEST_RUN_ID: process.env.TMS_TEST_RUN_ID,
    TMS_TEST_RUN_NAME: process.env.TMS_TEST_RUN_NAME,
    TMS_ADAPTER_MODE: process.env.TMS_ADAPTER_MODE ? stringToAdapterMode(process.env.TMS_ADAPTER_MODE) : undefined,
    TMS_CERT_VALIDATION: process.env.TMS_CERT_VALIDATION ? stringToBoolean(process.env.TMS_CERT_VALIDATION) : undefined,
    TMS_AUTOMATIC_CREATION_TEST_CASES: process.env.TMS_AUTOMATIC_CREATION_TEST_CASES ? stringToBoolean(process.env.TMS_AUTOMATIC_CREATION_TEST_CASES) : undefined,
    TMS_CONFIG_FILE: process.env.TMS_PRIVATE_TOKEN,
  };
}

function stringToAdapterMode(str: string): AdapterMode | undefined {
  switch (str) {
    case "2":
      return 2;
    case "1":
      return 1;
    case "0":
      return 0;
    default:
      return undefined;
  }
}

function stringToBoolean(str: string): boolean {
  return (str?.toLowerCase() === "true");
}
