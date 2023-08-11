import { AdapterConfig, EnvironmentOptions } from "../../common";

export interface IConfigComposer {
  compose(base?: Partial<AdapterConfig>): AdapterConfig;
  merge(file: AdapterConfig, env?: Partial<EnvironmentOptions>, base?: Partial<AdapterConfig>): AdapterConfig;
}
