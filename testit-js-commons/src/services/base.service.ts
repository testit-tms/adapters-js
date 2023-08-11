import { AdapterConfig } from "../common";

export class BaseService {
  constructor(protected readonly config: AdapterConfig) {
    if (!config) throw new Error("Client config not found");
    if (!config.url) throw new Error("Url is not defined");
    if (!config.privateToken) throw new Error("Authorization token is not defined");
    if (!config.configurationId) throw new Error("Configuration id is not defined");
    if (!config.projectId) throw new Error("Project id is not defined");
  }
}
