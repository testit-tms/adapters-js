import { AdapterConfig, AutotestResult, IClient } from "testit-js-commons";
import { BaseStrategy } from "./base.strategy";
import { Logger } from "../common/classes";
import { Strategy } from "../types";

// Adapter mode 1
export class DefaultStrategy extends BaseStrategy implements Strategy {
  constructor(
    protected readonly http: IClient,
    protected readonly logger: Logger,
    protected readonly config: AdapterConfig
  ) {
    super(http, logger, config);
  }

  public async bootstrap(): Promise<void> {
    if (!this.config.testRunId) {
      this.logger.error("Test run id is required when adapter mode is 1");
      process.exit(1);
    }
    await this.http.testRuns.startTestRun(this.config.testRunId);
  }

  public async teardown(): Promise<void> {
    await this.http.testRuns.completeTestRun(this.config.testRunId);
  }

  public async transferTestsToSystem(suite) {
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

      const run: AutotestResult = this.runsBuilder.build(test, config, attachments);
      await this.http.testRuns.loadAutotests(this.config.testRunId, [run]);
    }

    this.logger.log(`Test run - ${this.config.testRunId} transferred to remote system`);
  }
}
