import { AdapterProperties } from '../types/adapter-properties';
import { IClientConfiguration } from '../types/client-configuration';

export class ClientConfiguration implements IClientConfiguration {
    private url: string;
    private privateToken: string;
    private projectId: string;
    private configurationId: string;
    private testRunId: string | undefined;
    private testRunName: string | undefined;
    private adapterMode: string;

    constructor(properties: AdapterProperties) {
        this.url = properties.url;
        this.privateToken = properties.privateToken;
        this.projectId = properties.projectId;
        this.configurationId = properties.configurationId;
        this.testRunId = properties.testRunId;
        this.testRunName = properties.testRunName;
        this.adapterMode = properties.adapterMode;
    }

    public getUrl(): string {
        return this.url;
    }

    public getPrivateToken(): string {
        return this.privateToken;
    }

    public getProjectId(): string {
        return this.projectId;
    }

    public setProjectId(id: string) {
        this.projectId = id;
    }

    public getConfigurationId(): string {
        return this.configurationId;
    }

    public getTestRunId(): string | undefined {
        return this.testRunId;
    }

    public setTestRunId(id: string) {
        this.testRunId = id;
    }

    public getTestRunName(): string | undefined {
        return this.testRunName;
    }

    public getMode(): string {
        return this.adapterMode;
    }
}
