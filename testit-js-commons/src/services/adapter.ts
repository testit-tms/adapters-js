import { AppPropetries } from "../properties/app-properties";
import { AdapterProperties } from "../types/adapter-properties";
import { AdapterManager } from "./adapter-manager";
import { ConfigManager } from "./config-manager";

export class Adapter {
    private static adapterManager: AdapterManager | undefined;

    static getAdapterManager(properties: Partial<AdapterProperties>) {
        if (Adapter.adapterManager === undefined) {
            const configManager = new ConfigManager(
                AppPropetries.loadProperties(properties));

                Adapter.adapterManager = new AdapterManager(configManager);
        }

        return Adapter.adapterManager;
    }
}
