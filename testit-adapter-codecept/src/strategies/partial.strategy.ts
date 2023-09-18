import { AdapterConfig, AutotestResult, IClient } from "testit-js-commons";
import { useCompositeHash, useDefaultHash } from "../common/utils";
import { Logger } from "../common/classes";
import { BaseStrategy } from "./base.strategy";
import { Codecept, Strategy } from "../types";

// Adapter mode 0
export class PartialStrategy extends BaseStrategy implements Strategy {
  private readonly testsInRun = this.http.testRuns.getAutotests(this.config.testRunId);

  constructor(
    protected readonly http: IClient,
    protected readonly logger: Logger,
    protected readonly config: AdapterConfig
  ) {
    super(http, logger, config);
  }

  public async bootstrap(): Promise<void> {
    if (!this.config.testRunId) {
      this.logger.error("Test run id is required when adapter mode is 0");
      process.exit(1);
    }
    await this.http.testRuns.startTestRun(this.config.testRunId);
  }

  public async teardown(): Promise<void> {
    await this.http.testRuns.completeTestRun(this.config.testRunId);
  }

  private async getTestsIdsInRun() {
    const tests = await this.testsInRun;
    return tests?.map((test) => test.autoTest.externalId);
  }

  public async beforeTest(test: Codecept.Test) {
    const tests = await this.getTestsIdsInRun();

    const hash = useDefaultHash(test) ?? useCompositeHash(test);

    if (!tests.includes(hash.toString())) {
      test.run = () => test.skip();
    }
  }

  public async transferRunsToSystem(suite) {
    const tests = await this.getTestsIdsInRun();

    const data: AutotestResult[] = await Promise.all(
      suite.tests
        ?.filter((test) => {
          const hash = useDefaultHash(test) ?? useCompositeHash(test);
          return tests.includes(hash.toString());
        })
        ?.map(async (test) => {
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

          return this.runsBuilder.build(test, config, attachments);
        })
    );

    if (data.length) {
      await this.http.testRuns.loadAutotests(this.config.testRunId, data);
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
      }),
    };

    await this.createOrUpdateTests(suiteWithNeededTests);
  }
}
