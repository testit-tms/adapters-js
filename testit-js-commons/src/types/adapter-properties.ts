export interface AdapterProperties {
    url: string;
    privateToken: string;
    projectId: string;
    configurationId: string;
    testRunId?: string;
    testRunName?: string;
    adapterMode: string;
}
