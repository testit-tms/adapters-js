import { Logger } from '../common/classes/logger.class';
import { useCompositeHash, useDefaultHash } from '../common/functions/use-hash.function';
import { DefaultHttpClient } from '../http/default-http-client.class';
import { AttachmentsService } from '../services/attachments.service';
import { Codecept } from '../types/codecept.type';
import { Strategy } from '../types/strategy.type';
import { Origin } from '../types/origin.type';
import { BaseStrategy } from './base-strategy.class';

export class PartialStrategy
  extends BaseStrategy implements Strategy {
  private readonly attachments = new AttachmentsService(this.http);
  private readonly testsInRun = this.http.getTestsIdsByRunId(this.config.testRunId);

  constructor(
    protected readonly http: DefaultHttpClient,
    protected readonly logger: Logger,
    protected readonly config: Origin.Config
  ) {
    super(http, logger, config);
  }

  public async bootstrap() {
    await this.http.startRunIfNeeded(this.config.testRunId);
  }

  public async teardown(): Promise<void> {
    await this.http.completeRunIfNeeded(this.config.testRunId);
  }

  public async beforeTest(test: Codecept.Test) {
    const tests = await this.testsInRun;
    const hash = useDefaultHash(test) ?? useCompositeHash(test);

    if (!tests.includes(hash.toString())) {
      test.run = () => test.skip();
    }
  }

  public async transferRunsToSystem(suite) {
    const tests = await this.testsInRun;

    const data = await Promise.all(
      suite.tests
        .filter(test => {
          const hash = useDefaultHash(test) ?? useCompositeHash(test);

          return tests.includes(hash.toString());
        })
        .map(async (test) => {
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

          return this.runsBuilder.build(test, config, attachments);
        })
    );

    if (data.length) {
      await this.http.updateManyRuns(data);

      this.logger.log(`Test run - ${this.config.testRunId} transferred to remote system`);
    }
  }

  public async transferTestsToSystem(suite: Mocha.Suite) {
    const tests = await this.testsInRun;

    const suiteWithNeededTests = {
      ...suite,
      tests: suite.tests.filter((test: Codecept.Test) => {
        const hash = useDefaultHash(test) ?? useCompositeHash(test);

        return tests.includes(hash.toString());
      })
    };

    await this.createOrUpdateTests(suiteWithNeededTests);
  }
}