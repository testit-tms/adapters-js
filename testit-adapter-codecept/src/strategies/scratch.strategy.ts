import { AdapterConfig, IClient } from "testit-js-commons";
import { BaseStrategy } from "./base.strategy";
import { Logger } from "../common/classes";
import { Strategy } from "../types";

// Adapter mode 2
export class ScratchStrategy extends BaseStrategy implements Strategy {
  private testRunId: string;

  constructor(
    protected readonly http: IClient,
    protected readonly logger: Logger,
    protected readonly config: AdapterConfig
  ) {
    super(http, logger, config);
  }

  public async bootstrap(): Promise<void> {
    this.testRunId = await this.http.testRuns.createTestRun();
    await this.http.testRuns.startTestRun(this.testRunId);
  }

  public async teardown(): Promise<void> {
    await this.http.testRuns.completeTestRun(this.testRunId);
  }

  public async transferTestsToSystem(suite: Mocha.Suite) {
    await this.createOrUpdateTests(suite);
  }

  public async transferRunsToSystem(suite) {
    for (const test of suite.tests) {
      const config = this.box.get(test.id);

      const screenshot = test.artifacts?.screenshot;
      const clientUrls = config?.attachments ?? [];

      if (screenshot) {
        clientUrls.push(screenshot);
      }

      const attachments = await this.http.attachments.uploadAttachments(clientUrls);

      if (config?.text) {
        const attach = await this.http.attachments.uploadTextAttachment(config.text.content, config.text?.name);
        attachments.push(...attach);
      }

      const autotestResult = this.runsBuilder.build(test, config, attachments);

      await this.http.testRuns.loadAutotests(this.testRunId, [autotestResult]).catch((e) => {
        console.log("Error load test run.");
        console.log(e);
      });
    }

    this.logger.log(`Test run - ${this.testRunId} transferred to remote system`);
  }
}
