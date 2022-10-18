import { AdapterProperties } from "../types/adapter-properties";

export class AdapterConfiguration {
    private mode: string;

    constructor(properties: AdapterProperties) {
        this.mode = properties.adapterMode;
    }

    getMode(): string {
        return this.mode;
    }
}
