import { AutotestPost } from 'testit-api-client';
import { Box } from '../common/classes/box.class';
import { Logger } from '../common/classes/logger.class';
import { isPassed } from '../common/functions/is-passed.function';
import { useCompositeHash, useConfig, useDefaultHash } from '../common/functions/use-hash.function';
import { DefaultHttpClient } from '../http/default-http-client.class';
import { RunsBuilder } from '../services/runs.builder';
import { TestsBuilder } from '../services/tests.builder';
import { Codecept } from '../types/codecept.type';
import { Origin } from '../types/origin.type';

export abstract class BaseStrategy {
  protected readonly testsBuilder = new TestsBuilder(this.config);
  protected readonly runsBuilder = new RunsBuilder(this.config);
  protected readonly box = new Box<Origin.TestMetadata>();

  protected constructor(
    protected readonly http: DefaultHttpClient,
    protected readonly logger: Logger,
    protected readonly config: Origin.Config
  ) {
  }

  public collect(id: string, metadata: Origin.TestMetadata) {
    this.box.collectWithMerge(id, metadata);
  }

  public async connectToTest(id: string, test: Codecept.Test) {
    const config = useConfig(test);
    const ids = config?.workitemIds ?? [];

    await this.http.linkToWorkItem(id, ids);
  }

  public beforeTest(test: Mocha.Test): Promise<any> {
    return Promise.resolve();
  }

  public async createOrUpdateTests(suite) {
    for (const test of suite.tests) {

      const testToOriginSystem = this.testsBuilder.build(test);
      const fromOriginSystem = await this.http.hasInSystem(
        useDefaultHash(test) ?? useCompositeHash(test)
      );

      !fromOriginSystem
        ? await this.createTestInOriginSystem(testToOriginSystem, test)
        : await this.updateTestInOriginSystem(fromOriginSystem, testToOriginSystem, test);
    }
  }

  protected async createTestInOriginSystem(testToOriginSystem: AutotestPost, test: Codecept.Test) {
    testToOriginSystem.shouldCreateWorkItem = this.config.automaticCreationTestCases;

    const response = await this.http.create(testToOriginSystem);

    if (!response) {
      return;
    }

    this.logger.log(`Test - ${response.name} created in remote system`);
    await this.connectToTest(response.id, test);
  }

  protected async updateTestInOriginSystem(
    fromOriginSystem: AutotestPost,
    testToOriginSystem: AutotestPost,
    test: Codecept.Test
  ) {
    const hasPassedState = isPassed(test);
    const config = useConfig(test);

    if (hasPassedState) {
      await this.http.update(testToOriginSystem);
      await this.connectToTest(fromOriginSystem.id, test);
    }

    if (!hasPassedState) {
      await this.http.update({
        ...fromOriginSystem,
        links: config?.links ?? []
      });

      this.logger.log(`Test - ${fromOriginSystem.name} updated in remote system`);
    }
  }
}