import type { IAttachmentsService, IAutotestService, ITestResultsService, ITestRunsService } from "../services";
import type { AdapterConfig } from "../common";

export interface IClient {
  attachments: IAttachmentsService;
  autoTests: IAutotestService;
  testResults: ITestResultsService;
  testRuns: ITestRunsService;

  getConfig(): AdapterConfig;
}
