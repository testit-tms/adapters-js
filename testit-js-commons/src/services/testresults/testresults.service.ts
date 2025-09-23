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

  public async getTestResults(): Promise<string[]> {
    var skip = 0;
    var allTestResults: string[] = [];
    const model: TestResultsFilterApiModel = this._converter.getTestResultsFilterApiModel();

    while (skip >= 0) {
      const testResults: TestResultShortResponse[] = await this._client
        .apiV2TestResultsSearchPost(skip, this._testsLimit, undefined, undefined, undefined, model)
        .then(({ body }) => body)
        .catch((err) => {
          handleHttpError(err);

          return [];
        });

      allTestResults = allTestResults.concat(
        testResults.map((result) => result.autotestExternalId).filter((id): id is string => id !== undefined)
      );
      skip += this._testsLimit;

      if (testResults.length == 0) {
        skip = -1;
      }
    }

    return allTestResults;
  }
}
