import { ConfigComposer, StrategyFactory, IStrategy, Additions, Attachment } from "testit-js-commons";
import { Converter } from "./converter";
import { TestRunInfo } from "./types";
import Metadata from "./metadata";

export default class TmsReporter {
  strategy: IStrategy;
  private readonly additions: Additions;
  private testCache = new Array<object>();
  private loadTestPromises = new Array<Promise<void>>();
  private groupMetadata!: Metadata;
  private groupPath!: string;

  constructor() {
    const config = new ConfigComposer().compose();
    this.strategy = StrategyFactory.create(config);
    this.additions = new Additions(config);
  }

  onFixtureBegin(name: string, path: string, meta: object): void {
    this.groupMetadata = new Metadata(meta);
    this.groupPath = path;
  }

  onTestBegin(meta: object): void {
    this.testCache.push(meta);
  }

  async onTestEnd(name: string, testRunInfo: TestRunInfo, meta: object, testData: any): Promise<void> {
    await this.loadTestPromises.push(
      this.loadTest(name, testRunInfo, meta, testData)
    );
  }

  async onEnd(): Promise<void> {
    await Promise.all(this.loadTestPromises);
  }

  private async loadTest(name: string, testRunInfo: TestRunInfo, meta: object, testData: any): Promise<void> {
    const autotestData = new Metadata(meta, this.groupPath, name);

    autotestData.mergeMetadata(this.groupMetadata);

    const autotest = Converter.convertTestCaseToAutotestPost(autotestData);
    const autotestResult = Converter.convertAutotestPostToAutotestResult(autotestData, testRunInfo);

    autotestResult.links = this.additions.links;
    autotestResult.message = this.additions.messages.join("\n");
    
    if (testData !== undefined) {
        if (testData.message !== undefined) {
            autotestResult.message = testData.message;
        }
        if (testData.links !== undefined) {
          autotestResult.links = testData.links;
        }
        if (testData.attachments !== undefined) {
          autotestResult.attachments = await this.addAttachments(testData.attachments);
        }
    }

    await this.strategy.loadAutotest(
      autotest,
      "Passed");
    await this.strategy.loadTestRun([autotestResult]);
  }
  
  private addAttachments(paths: string | string[]) {
    const promise: Promise<Attachment[]> =
      typeof paths === "string"
        ? this.additions.addAttachments([paths])
        : this.additions.addAttachments(paths);

    return promise;
  };
}
