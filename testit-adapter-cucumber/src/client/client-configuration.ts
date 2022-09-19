import { Properties } from '../types/properties';
import { IClientConfiguration } from '../types/client-configuration';

export class ClientConfiguration implements IClientConfiguration {
    url: string;
    privateToken: string;
    projectId: string;
    configurationId: string;
    testRunId: string | undefined;
    testRunName: string | undefined;
    adapterMode: string;

    constructor(properties: Properties) {
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
