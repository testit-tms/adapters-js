import { AdapterConfig, BaseConverter } from "../../common";

const TEST_RUN_ID_GUID =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export function isValidTestRunId(value: string | undefined | null): value is string {
  return typeof value === "string" && TEST_RUN_ID_GUID.test(value);
}

export interface ITestResultsConverter {
  getTestResultsFilterApiModel(): any | null;
  getTestResultsFilterForRun(): any | null;
}

export class TestResultsConverter extends BaseConverter implements ITestResultsConverter {
  constructor(config: AdapterConfig) {
    super(config);
  }

  private buildRunFilter(statusTypes?: string[]): any | null {
    if (!isValidTestRunId(this.config.testRunId)) {
      return null;
    }

    return {
      testRunIds: [this.config.testRunId],
      configurationIds: [this.config.configurationId],
      statusTypes,
    };
  }

  getTestResultsFilterApiModel(): any | null {
    return this.buildRunFilter(["InProgress"]);
  }

  getTestResultsFilterForRun(): any | null {
    return this.buildRunFilter(undefined);
  }
}
