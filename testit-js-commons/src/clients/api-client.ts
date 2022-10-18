import {
    TestRunsApi,
    AutoTestsApi,
    AutoTestPostModel,
    AttachmentsApi,
    AutoTestPutModel,
    Configuration,
    AutoTestModel,
} from 'testit-api-client';
import { basename } from 'path';
import { ClientConfiguration } from './client-configuration';
import { parsedAutotests } from '../services/utils';
import { Converter } from './converter';
import { TestResult } from '../types/test-result';

export class ApiClientWorker {
    private config: ClientConfiguration;
    private testRunsApi: TestRunsApi;
    private autoTestsApi: AutoTestsApi;
    private attachmentsApi: AttachmentsApi;

    constructor(config: ClientConfiguration) {
        const clientConfig = new Configuration({
            'apiKey': 'PrivateToken ' + config.getPrivateToken(),
            'basePath': config.getUrl(),
        });

        this.testRunsApi = new TestRunsApi(clientConfig);
        this.autoTestsApi = new AutoTestsApi(clientConfig);
        this.attachmentsApi = new AttachmentsApi(clientConfig);

        this.config = config;
    }

    getTestRunId() {
        return this.config.getTestRunId();
    }

    async createTestRun(): Promise<void> {
        await this.testRunsApi.createEmpty({
            'projectId': this.config.getProjectId(),
            'name': this.config.getTestRunName()
            })
            .then(response => this.config.setTestRunId(response.data.id))
            .catch(response => {
                throw new Error(response.data);
            });
    }

    async startTestRun(): Promise<void> {
        const testRunId = this.config.getTestRunId();
        if (testRunId !== undefined) {
            await this.testRunsApi.startTestRun(testRunId)
                .catch(response => this.logError(response));
        } else {
            console.error('The test run cannot be started. The test run ID is not defined.');
        }
    }

    async getAutotestsByTestRunId(): Promise<string[] | void> {
        const testRunId = this.config.getTestRunId();

        if (testRunId !== undefined) {
            return await this.testRunsApi.getTestRunById(testRunId)
                .then(response => {
                    const projectId = response.data.projectId;
                    const testResults = response.data.testResults;

                    if (projectId !== undefined) {
                        this.config.setProjectId(projectId);
                    } else {
                        console.error('The project ID is not defined and cannot be set.');
                    }

                    if (testResults != undefined) {
                        return parsedAutotests(
                            testResults,
                            this.config.getConfigurationId());
                    }

                    console.error('Autotests from the test run are not defined and cannot be set.');
                })
                .catch(response => this.logError(response));
        }

        console.error('Autotests cannot be received. The test run ID is not defined.');
    }

    async getAutotestByExternalId(externalId: string): Promise<AutoTestModel | void> {
        const autotest = await this.autoTestsApi.getAllAutoTests(
            this.config.getProjectId(),
            externalId)
            .then(response => {
                return response.data[0]
            })
            .catch(response => this.logError(response));

        return autotest;
    }

    async createAutotest(autotest: TestResult): Promise<void> {
        const model: AutoTestPostModel = Converter.convertTestResultToAutoTestPostModel(
            autotest,
            this.config.getProjectId());

        await this.autoTestsApi.createAutoTest(model)
            .catch(response => {

                if (response.status === 409) {
                    this.updateAutotest(autotest);
                } else {
                    this.logError(response);
                }
            });
    }

    async updateAutotest(autotest: TestResult): Promise<void> {
        const model: AutoTestPutModel = Converter.convertTestResultToAutoTestPutModel(
            autotest,
            this.config.getProjectId());

        await this.autoTestsApi.updateAutoTest(model)
            .catch(response => this.logError(response));
    }

    async linkAutotestToWorkItemId(externalId: string, workItemId: string): Promise<void> {
        const autotest = await this.getAutotestByExternalId(externalId);

        if (autotest !== undefined && autotest.id !== undefined) {
            await this.autoTestsApi.linkAutoTestToWorkItem(
                autotest.id,
                {'id': workItemId})
                .catch(response => this.logError(response));
        } else {
            console.error('The autotest cannot be linked with WI. The autotest is not defined.');
        }
    }

    async setTestResultForTestRun(testResult: TestResult): Promise<void> {
        const testRunId = this.config.getTestRunId();

        if (testRunId !== undefined) {
            const model = Converter.convertTestResultToAutoTestResultsForTestRunModel(
                testResult,
                this.config.getConfigurationId());
    
            await this.testRunsApi.setAutoTestResultsForTestRun(
                testRunId,
                [model])
                .catch(response => this.logError(response));
        } else {
            console.error('The test result cannot be loaded. The test run ID is not defined.');
        }
    }

    async loadAttachment(attachment: string): Promise<any> {
        const attachmentId = await this.attachmentsApi.apiV2AttachmentsPost(
            {'file': new File([attachment], basename(attachment))})
            .then(response => {
                return response.data[0]
            })
            .catch(response => this.logError(response));

        return attachmentId;
    }

    private logError(err: any): void {
        console.error(
            err.status,
            err.config.method,
            err.config.url,
            err.data
        );
    }

    // TODO: add stopping run on error
}
