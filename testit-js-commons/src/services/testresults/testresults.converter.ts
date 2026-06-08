// @ts-ignore
import { TestResultsFilterApiModel } from "testit-api-client";
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
      statusCodes: undefined,
      outcomes: undefined,
      failureCategories: undefined,
      namespace: undefined,
      className: undefined,
      autoTestGlobalIds: undefined,
      name: undefined,
      createdDate: undefined,
      modifiedDate: undefined,
      startedOn: undefined,
      completedOn: undefined,
      duration: undefined,
      resultReasons: undefined,
      autoTestTags: undefined,
      excludeAutoTestTags: undefined,
    };
  }

  getTestResultsFilterApiModel(): TestResultsFilterApiModel {
    return this.buildRunFilter(["InProgress"]);
  }

  getTestResultsFilterForRun(): TestResultsFilterApiModel {
    return this.buildRunFilter(undefined);
  }
}
