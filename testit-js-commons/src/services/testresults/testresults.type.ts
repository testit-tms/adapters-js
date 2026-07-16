import type TestResultUpdateRequest from "adapters-api/model/TestResultUpdateRequest";

export interface ITestResultsService {
  getExternalIdsForRun(): Promise<string[]>;
  findTestResultIdByExternalId(externalId: string): Promise<string | undefined>;
  updateTestResult(testResultId: string, model: TestResultUpdateRequest): Promise<void>;
}
