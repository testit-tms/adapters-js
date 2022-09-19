import {
    ApiClient,
    TestRunsApi,
    TestRunV2PostShortModel,
    AutoTestsApi,
    AutoTestPostModel,
    AutoTestResultsForTestRunModel,
    AttachmentsApi
} from 'testit-api-client';
import { basename } from 'path';
import { ClientConfiguration } from './client-configuration';
import { AdapterMode } from '../models/adapter-mode';
import { IStorage } from '../types/storage';
import { parsedAutotests } from '../utils';
import { AutotestPostWithWorkItemId } from '../mappers';
import { AxiosError } from 'axios';

export class ApiClientWorker {
    private config: ClientConfiguration;
    private client;

    private callback = function(error: any, data: any, response: any) {
        if (error) {
          console.error(error);
        }
    };

    private testRunId: Promise<string> | undefined;
    private testRunStarted: Promise<void> | undefined;

    constructor(config: ClientConfiguration) {
        this.client = ApiClient.instance;

        this.client.basePath = config.getUrl();
        this.client.authentications['PrivateToken'].apiKey = config.getPrivateToken();

        this.config = config;
    }

    startLaunch() {
        var testRunsApi = new TestRunsApi(this.client);

        if(this.config.getMode() === AdapterMode.NEW_TEST_RUN) {

            var testRunV2PostShortModel = new TestRunV2PostShortModel(this.config.getProjectId());

            testRunV2PostShortModel.name = this.config.getTestRunName()

            const response = testRunsApi.createEmpty({testRunV2PostShortModel}, this.callback);

            this.config.setTestRunId(response.id);
            testRunsApi.startTestRun(response.id, this.callback);
            
            return;
        }

        const response = testRunsApi.getTestRunById(this.config.getTestRunId()!, this.callback);

        this.config.setProjectId(response.projectId);

        if(this.config.getMode() === AdapterMode.RUN_ALL_TESTS) {
            return;
        }

        return parsedAutotests(
            response.testResults,
            this.config.getConfigurationId());
    }

    writeTests(storage: IStorage) {
        var testRunsApi = new TestRunsApi(this.client);

        const results = storage.getTestRunResults(this.config.getConfigurationId());

        if (this.config.getTestRunId() !== undefined && results.length > 0) {
            Promise.all([
                this.config.getTestRunId(),
                this.testRunStarted
            ])
            .then(async ([id]) => {
                const autotests = storage.getAutotests(
                    this.client.getConfig().projectId
                );
                await Promise.all(
                    autotests.map((autotestPost: AutoTestPostModel) => {
                        const result = results.find(
                            (result: AutoTestResultsForTestRunModel) => result.autoTestExternalId === autotestPost.externalId
                        );
                        if (result !== undefined) {
                            if (result.outcome !== 'Passed') {
                                return this.loadAutotest(autotestPost);
                            }
                            return this.loadPassedAutotest(autotestPost);
                        }
                    })
                );
                await Promise.all(
                    results.map((result: any) => {
                        testRunsApi.setAutoTestResultsForTestRun
                        return testRunsApi.setAutoTestResultsForTestRun(id!, [result], this.callback);
                    })
                );
            })
            .catch((err) => {
                console.error(err);
                this.testRunId?.then((id: any) => testRunsApi.completeTestRun(id, this.callback));
            });
        }
    }

    async loadAutotest(autotestPost: AutotestPostWithWorkItemId): Promise<void> {
        try {
            await this.createNewAutotest(autotestPost);
        } catch (err) {
            const axiosError = err as AxiosError;

            if (axiosError.response?.status === 409) {
                const [autotest] = await this.client.getAutotest({
                    projectId: this.client.getConfig().projectId,
                    externalId: autotestPost.externalId,
                });
                await this.updateAutotest({
                    ...autotest,
                    links: autotestPost.links,
                });
            } else {
                this.logError(axiosError);
            }
        }
    }

    async loadPassedAutotest(
        autotestPost: AutotestPostWithWorkItemId
    ): Promise<void> {
        try {
            await this.createNewAutotest(autotestPost);
        } catch (err) {
            const axiosError = err as AxiosError;
            if (axiosError.response?.status === 409) {
                await this.updateAutotest(autotestPost);
            } else {
                this.logError(axiosError);
            }
        }

        if (autotestPost.workItemIds !== undefined) {
            for (const workItemId of autotestPost.workItemIds) {
                this.linkWorkItem(autotestPost.externalId, workItemId);
            }
        }
    }

    async createNewAutotest(
        autotestPost: AutotestPostWithWorkItemId
    ): Promise<void> {
        var autoTestsApi = new AutoTestsApi(this.client);

        await autoTestsApi.createAutoTest({'autoTestPostModel': autotestPost}, this.callback);
    }

    async updateAutotest(
        autotestPost: AutotestPostWithWorkItemId
    ): Promise<void> {
        var autoTestsApi = new AutoTestsApi(this.client);

        await autoTestsApi.updateAutoTest({'autoTestPutModel': autotestPost}, this.callback).catch(this.logError);
    }

    async linkWorkItem(externalId: string, workItemId: string): Promise<void> {
        const [autotest] = await this.client
            .getAutotest({
                projectId: this.client.getConfig().projectId,
                externalId: externalId,
            })
            .catch(() => []);
        if (autotest?.id !== undefined) {
            await this.client.linkToWorkItem(autotest.id, {
                id: workItemId,
            });
        }
    }

    async loadAttachment(attachment: string) {
        var attachmentsApi = new AttachmentsApi(this.client);

        var id = attachmentsApi.apiV2AttachmentsPost(
            {'file': new File([attachment], basename(attachment))},
            this.callback);

        return id;
    }

    private logError(err: AxiosError): void {
        console.error(
            err.response?.status,
            err.config.method,
            err.config.url,
            err.response?.data
        );
    }

    // TODO: add stopping run on error
}
