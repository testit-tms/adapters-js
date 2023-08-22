import { AdapterConfig, IClient } from "testit-js-commons";
import { Box, Logger } from "../common/classes";
import { useConfig, isPassed } from "../common/utils";
import { RunsBuilder, TestsBuilder } from "../builders";
import { Codecept, Origin } from "../types";

export abstract class BaseStrategy {
  protected readonly testsBuilder = new TestsBuilder(this.config);
  protected readonly runsBuilder = new RunsBuilder(this.config);
  protected readonly box = new Box<Origin.TestMetadata>();

  protected constructor(
    protected readonly http: IClient,
    protected readonly logger: Logger,
    protected readonly config: AdapterConfig
  ) {}

  public collect(id: string, metadata: Origin.TestMetadata) {
    this.box.collectWithMerge(id, metadata);
  }

  public async connectToTest(externalId: string, test: Codecept.Test) {
    const config = useConfig(test);
    const ids = config?.workitemIds || [];

    await this.http.autoTests.linkToWorkItems(externalId, ids);
  }

  public beforeTest(test: Codecept.Test): Promise<void> {
    return Promise.resolve();
  }

  public async createOrUpdateTests(suite) {
    for (const test of suite.tests) {
      const hasPassedState = isPassed(test);
      const testToOriginSystem = this.testsBuilder.build(test);

      await this.http.autoTests.loadAutotest(testToOriginSystem, hasPassedState).catch((err) => {
        console.log("Error load autotest. \n", err);
      });

      await this.connectToTest(testToOriginSystem.externalId, test).catch((err) => {
        console.log("Error link work item. \n", err);
      });
    }
  }
}
