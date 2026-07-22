export interface ITestResultsService {
  getExternalIdsForRun(): Promise<string[]>;
  findTestResultIdByExternalId(externalId: string): Promise<string | undefined>;
  updateTestResult(testResultId: string, model: any): Promise<void>;
}
