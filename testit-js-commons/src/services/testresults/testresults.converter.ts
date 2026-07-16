import type TestResultsFilterApiModel from "adapters-api/model/TestResultsFilterApiModel";
import { AdapterConfig, BaseConverter } from "../../common";

export interface ITestResultsConverter {
  getTestResultsFilterApiModel(): TestResultsFilterApiModel;
  getTestResultsFilterForRun(): TestResultsFilterApiModel;
}

export class TestResultsConverter extends BaseConverter implements ITestResultsConverter {
  constructor(config: AdapterConfig) {
    super(config);
  }

  private buildRunFilter(statusTypes?: string[]): TestResultsFilterApiModel {
    return {
      testRunIds: [this.config.testRunId],
      configurationIds: [this.config.configurationId],
      statusTypes,
    };
  }

  getTestResultsFilterApiModel(): TestResultsFilterApiModel {
    return this.buildRunFilter(["InProgress"]);
  }

  getTestResultsFilterForRun(): TestResultsFilterApiModel {
    return this.buildRunFilter(undefined);
  }
}
