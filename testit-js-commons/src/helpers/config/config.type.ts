import { AdapterConfig, EnvironmentOptions } from "../../common";

export interface IConfigComposer {
  compose(base?: Partial<AdapterConfig>): AdapterConfig;
  mergeAll(file: AdapterConfig, env?: Partial<EnvironmentOptions>, base?: Partial<AdapterConfig>): AdapterConfig;
  merge(env?: Partial<EnvironmentOptions>, base?: Partial<AdapterConfig>): AdapterConfig;
}
