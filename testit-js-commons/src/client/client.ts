import { AdapterConfig } from "../common";
import {
  AutotestsService,
  AttachmentsService,
  TestRunsService,
  type IAttachmentsService,
  type IAutotestService,
  type ITestRunsService,
} from "../services";
import { IClient } from "./client.type";

export class Client implements IClient {
  public attachments: IAttachmentsService;
  public autoTests: IAutotestService;
  public testRuns: ITestRunsService;

  constructor(private readonly config: AdapterConfig) {
    this.attachments = new AttachmentsService(config);
    this.autoTests = new AutotestsService(config);
    this.testRuns = new TestRunsService(config);
  }

  getConfig(): Readonly<AdapterConfig> {
    return this.config;
  }
}
