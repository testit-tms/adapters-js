export interface IClientConfiguration {
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
