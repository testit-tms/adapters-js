import { ClientConfiguration } from "../clients/client-configuration";
import { AdapterProperties } from "../types/adapter-properties";
import { AdapterConfiguration } from "./adapter-configuration";

export class ConfigManager {
    private properties: AdapterProperties;

    constructor(properties: AdapterProperties) {
        this.properties = properties;
    }

    getAdapterConfig() {
        return new AdapterConfiguration(this.properties);
    }

    getClientConfig(): ClientConfiguration {
        return new ClientConfiguration(this.properties);
    }
}
