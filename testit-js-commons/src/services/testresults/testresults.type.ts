export interface ITestResultsService {
  getTestResults(): Promise<string[]>;
}
