import { TestResultsFilterApiModel } from "testit-api-client";
import { AdapterConfig, BaseConverter } from "../../common";

export interface ITestResultsConverter {
  getTestResultsFilterApiModel(): TestResultsFilterApiModel;
}

export class TestResultsConverter extends BaseConverter implements ITestResultsConverter {
  constructor(config: AdapterConfig) {
    super(config);
  }

  getTestResultsFilterApiModel(): TestResultsFilterApiModel {
    const model: TestResultsFilterApiModel = {
        testRunIds: [this.config.testRunId],
        configurationIds: [this.config.configurationId],
        statusCodes: ["InProgress"],
    };

    return model;
  }
}
