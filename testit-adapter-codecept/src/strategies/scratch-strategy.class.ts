import { TestRunGet } from 'testit-api-client';
import { Logger } from '../common/classes/logger.class';
import { Nullable } from '../common/types/nullable.type';
import { DefaultHttpClient } from '../http/default-http-client.class';
import { AttachmentsService } from '../services/attachments.service';
import { Strategy } from '../types/strategy.type';
import { Origin } from '../types/origin.type';
import { BaseStrategy } from './base-strategy.class';

export class ScratchStrategy
  extends BaseStrategy implements Strategy {
  private readonly attachments = new AttachmentsService(this.http);

  private run: Nullable<TestRunGet>;

  constructor(
    protected readonly http: DefaultHttpClient,
    protected readonly logger: Logger,
    protected readonly config: Origin.Config
  ) {
    super(http, logger, config);
  }

  public async bootstrap(): Promise<void> {
    const run = await this.http.createEmptyRun(this.config.testRunName ?? '');

    if (run) {
      await this.http.startRunIfNeeded(run.id);

      this.run = run;
    }
  }

  public async teardown(): Promise<void> {
    await this.http.completeRunIfNeeded(this.run.id);
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

      const attachments = await this.attachments.attach(clientUrls);

      if (config?.text) {
        const attach = await this.attachments
          .attachTextLikeFile(config.text.content, config.text?.name);

        attachments.push(attach);
      }

      const data = this.runsBuilder.build(test, config, attachments);

      await this.http.updateRuns(data, this.run.id);
    }

    this.logger.log(`Test run - ${this.run.id} transferred to remote system`);
  }
}