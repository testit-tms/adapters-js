import { AdapterConfig, BaseConverter } from "../../common";

export interface ITestResultsConverter {
  getTestResultsFilterApiModel(): any;
  getTestResultsFilterForRun(): any;
}

export class TestResultsConverter extends BaseConverter implements ITestResultsConverter {
  constructor(config: AdapterConfig) {
    super(config);
  }

  private buildRunFilter(statusTypes?: string[]): any {
    return {
      testRunIds: [this.config.testRunId],
      configurationIds: [this.config.configurationId],
      statusTypes,
    };
  }

  getTestResultsFilterApiModel(): any {
    return this.buildRunFilter(["InProgress"]);
  }

  getTestResultsFilterForRun(): any {
    return this.buildRunFilter(undefined);
  }
}
