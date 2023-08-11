import type { IAttachmentsService, IAutotestService, ITestRunsService } from "../services";
import type { AdapterConfig } from "../common";

export interface IClient {
  attachments: IAttachmentsService;
  autoTests: IAutotestService;
  testRuns: ITestRunsService;

  getConfig(): AdapterConfig;
}
