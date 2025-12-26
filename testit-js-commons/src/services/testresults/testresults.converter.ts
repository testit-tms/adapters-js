// @ts-ignore
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
        resultReasons: undefined
    };

    return model;
  }
}
