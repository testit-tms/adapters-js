import { TestResultsApi, TestResultsApiApiKeys, TestResultsFilterApiModel, TestResultShortResponse } from "testit-api-client";
import { AdapterConfig, BaseService } from "../../common";
import { handleHttpError } from "./testresults.handler";
import { ITestResultsConverter, TestResultsConverter } from "./testresults.converter";
import { ITestResultsService } from "./testresults.type";

const testResultsApiKey = TestResultsApiApiKeys["Bearer or PrivateToken"];

export class TestResultsService extends BaseService implements ITestResultsService {
  protected _client: TestResultsApi;
  protected _converter: ITestResultsConverter;
  protected _testsLimit: number = 100;

  constructor(protected readonly config: AdapterConfig) {
    super(config);
    this._client = new TestResultsApi(config.url);
    this._converter = new TestResultsConverter(config);
    this._client.setApiKey(testResultsApiKey, `PrivateToken ${config.privateToken}`);
    if (config.certValidation !== undefined) {
      this._client.setRejectUnauthorized(config.certValidation);
    }
  }

  public async getExternalIdsForRun(): Promise<string[]> {
    var skip = 0;
    var externalIds: string[] = [];
    const model: TestResultsFilterApiModel = this._converter.getTestResultsFilterApiModel();

    while (true) {
      const testResults: TestResultShortResponse[] = await this.getTestResults(skip, model);

      if (testResults.length != 0) {
        externalIds = externalIds.concat(
        testResults.map((result) => result.autotestExternalId).filter((id): id is string => id !== undefined)
        );
        skip += this._testsLimit;

        continue;
      }

      return externalIds;
    }
  }

  private async getTestResults(skip: number, model: TestResultsFilterApiModel): Promise<TestResultShortResponse[]> {
    return await this._client
        .apiV2TestResultsSearchPost(skip, this._testsLimit, undefined, undefined, undefined, model)
        .then(({ body }) => body)
        .catch((err) => {
          handleHttpError(err);

          return [];
        });
  }
}
