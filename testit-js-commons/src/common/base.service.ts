import { AdapterConfig } from "../common";

// Generated adapters-api client is bundled into lib/adapters-api/dist during build.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const AdaptersApi = require("../adapters-api/dist/index") as typeof import("adapters-api/index");

export class BaseService {
  constructor(protected readonly config: AdapterConfig) {
    if (!config) throw new Error("Client config not found");
    if (!config.url) throw new Error("Url is not defined");
    if (!config.privateToken) throw new Error("Authorization token is not defined");
    if (!config.configurationId) throw new Error("Configuration id is not defined");
    if (!config.projectId) throw new Error("Project id is not defined");

    const defaultClient = AdaptersApi.ApiClient.instance;
    defaultClient.basePath = config.url;
    // @ts-ignore — ambient ApiClient types authentications loosely
    const auth = defaultClient.authentications["PrivateToken"];
    auth.apiKeyPrefix = "PrivateToken";
    auth.apiKey = config.privateToken;

    if (config.certValidation === false) {
      // @ts-ignore
      defaultClient.rejectUnauthorized = config.certValidation;
    }
  }
}
