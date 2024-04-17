import { AdapterConfig, EnvironmentOptions } from "../../common";

export interface IConfigComposer {
  compose(base?: Partial<AdapterConfig>): AdapterConfig;
  mergeAll(file: AdapterConfig, env?: Partial<EnvironmentOptions>, base?: Partial<AdapterConfig>): AdapterConfig;
  mergeEnv(dotEnv?: Partial<EnvironmentOptions>, processEnv?: Partial<EnvironmentOptions>): Partial<EnvironmentOptions>;
  merge(env?: Partial<EnvironmentOptions>, base?: Partial<AdapterConfig>): AdapterConfig;
}
