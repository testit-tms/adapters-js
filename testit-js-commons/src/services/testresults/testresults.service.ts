// @ts-ignore
import TestitApiClient from "testit-api-client";
import { AdapterConfig, BaseService } from "../../common";
import { handleHttpError } from "./testresults.handler";
import { ITestResultsConverter, TestResultsConverter } from "./testresults.converter";
import { ITestResultsService } from "./testresults.type";

export class TestResultsService extends BaseService implements ITestResultsService {
  protected _client
  protected _converter: ITestResultsConverter;
  protected _testsLimit: number = 100;

  constructor(protected readonly config: AdapterConfig) {
    super(config);
    this._client = new TestitApiClient.TestResultsApi();
    this._converter = new TestResultsConverter(config);
  }

  public async getExternalIdsForRun(): Promise<string[]> {
    var skip = 0;
    var externalIds: string[] = [];
    const model = this._converter.getTestResultsFilterApiModel();

    while (true) {
      const testResults = await this.getTestResults(skip, model);

      if (testResults.length != 0) {
        externalIds = externalIds.concat(
        testResults.map((// @ts-ignore
          result) => result.autotestExternalId).filter((id): id is string => id !== undefined)
        );
        skip += this._testsLimit;

        continue;
      }

      return externalIds;
    }
  }

  private async getTestResults(skip: number, model: any): Promise<any> {
    return await this._client
        .apiV2TestResultsSearchPost({skip: skip, take: this._testsLimit, testResultsFilterApiModel: model})
        // @ts-ignore
        .then(({ body }) => body)
        // @ts-ignore
        .catch((err) => {
          handleHttpError(err);

          return [];
        });
  }
}
