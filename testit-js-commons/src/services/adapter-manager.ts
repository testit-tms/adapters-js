import { ApiClientWorker } from "../clients/api-client";
import { AdapterMode } from "../properties/adapter-mode";
import { TestResult } from "../types/test-result";
import { AdapterConfiguration } from "./adapter-configuration";
import { ConfigManager } from "./config-manager";

export class AdapterManager {
    private client: ApiClientWorker;
    private config: AdapterConfiguration;

    constructor(configManager: ConfigManager) {
        this.config = configManager.getAdapterConfig();
        this.client = new ApiClientWorker(
            configManager.getClientConfig());
    }

    startLaunch(): Promise<void> {
        if (this.config.getMode() !== AdapterMode.NEW_TEST_RUN) {
            return Promise.resolve();
        }

        return this.client.createTestRun()
            .then(() => this.client.startTestRun());
    }

    getAutotestsForLaunch(): Promise<string[] | void> {
        if (this.config.getMode() === AdapterMode.USE_FILTER) {
            return this.client.getAutotestsByTestRunId();
        }

        return Promise.resolve();
    }

    writeTest(testResult: TestResult): Promise<void> {
        return this.client.createAutotest(testResult)
            .then(() => {
                if (testResult.workItemIds != undefined) {
                    for (const workItemId of testResult.workItemIds) {
                        this.client.linkAutotestToWorkItemId(testResult.externalId, workItemId);
                    }
                }

                this.client.setTestResultForTestRun(testResult);
            });
    }

    loadAttachment(attachmentPath: string): Promise<string | void> {
        return this.client.loadAttachment(attachmentPath);
    }
}
