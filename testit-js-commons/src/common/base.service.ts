import { AdapterConfig } from "../common";
// @ts-ignore
import * as AdaptersApi from "../adapters-api";

export class BaseService {
  constructor(protected readonly config: AdapterConfig) {
    if (!config) throw new Error("Client config not found");
    if (!config.url) throw new Error("Url is not defined");
    if (!config.privateToken) throw new Error("Authorization token is not defined");
    if (!config.configurationId) throw new Error("Configuration id is not defined");
    if (!config.projectId) throw new Error("Project id is not defined");

    const defaultClient = AdaptersApi.ApiClient.instance;
    defaultClient.basePath = config.url;
    const auth = defaultClient.authentications["PrivateToken"];
    auth.apiKeyPrefix = "PrivateToken";
    auth.apiKey = config.privateToken;

    if (config.certValidation === false) {
      defaultClient.rejectUnauthorized = config.certValidation;
    }
  }
}
