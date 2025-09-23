export interface ITestResultsService {
  getExternalIdsForRun(): Promise<string[]>;
}
