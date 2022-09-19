export interface IClientConfiguration {
    url: string;
    privateToken: string;
    projectId: string;
    configurationId: string;
    testRunId?: string;
    testRunName?: string;
    adapterMode: string;
    getUrl(): string;
    getPrivateToken(): string;
    getProjectId(): string;
    setProjectId(id: string): void;
    getConfigurationId(): string;
    getTestRunId(): string | undefined;
    setTestRunId(id: string): void;
    getTestRunName(): string | undefined;
    getMode(): string;
}
