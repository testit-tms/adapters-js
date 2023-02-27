import { Logger } from '../common/classes/logger.class';
import { DefaultHttpClient } from '../http/default-http-client.class';
import { AttachmentsService } from '../services/attachments.service';
import { Strategy } from '../types/strategy.type';
import { Origin } from '../types/origin.type';
import { BaseStrategy } from './base-strategy.class';

export class DefaultStrategy
  extends BaseStrategy implements Strategy {
  private readonly attachments = new AttachmentsService(this.http);

  constructor(
    protected readonly http: DefaultHttpClient,
    protected readonly logger: Logger,
    protected readonly config: Origin.Config
  ) {
    super(http, logger, config);
  }

  public async bootstrap(): Promise<void> {
    await this.http.startRunIfNeeded(this.config.testRunId);
  }

  public async teardown(): Promise<void> {
    await this.http.completeRunIfNeeded(this.config.testRunId);
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

      const attachments = await this.attachments.attach(clientUrls);

      if (config?.text) {
        const attach = await this.attachments
          .attachTextLikeFile(config.text.content, config.text?.name);

        attachments.push(attach);
      }

      const run = this.runsBuilder.build(test, config, attachments);
      await this.http.updateRuns(run);
    }

    this.logger.log(`Test run - ${this.config.testRunId} transferred to remote system`);
  }
}