// @ts-ignore
import * as TestitApiClient from "testit-api-client";
import { AdapterConfig, BaseService } from "../../common";
import { withHttpRetry } from "../../common/utils";
import { handleHttpError } from "./testresults.handler";
import { ITestResultsConverter, TestResultsConverter } from "./testresults.converter";
import { ITestResultsService } from "./testresults.type";

export class TestResultsService extends BaseService implements ITestResultsService {
  protected _client;
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
          result) => result.autotestExternalId ?? result.autoTest?.externalId).filter((id): id is string => id !== undefined)
        );
        skip += this._testsLimit;

        continue;
      }

      return externalIds;
    }
  }

  public async findTestResultIdByExternalId(externalId: string): Promise<string | undefined> {
    const model = this._converter.getTestResultsFilterForRun();
    let skip = 0;

    while (true) {
      const batch = await this.getTestResults(skip, model);
      if (batch.length === 0) {
        return undefined;
      }

      for (const row of batch) {
        const rowExternalId = row.autotestExternalId ?? row.autoTest?.externalId;
        if (rowExternalId === externalId && row.id) {
          return row.id;
        }
      }

      skip += this._testsLimit;
      if (batch.length < this._testsLimit) {
        return undefined;
      }
    }
  }

  public async updateTestResult(testResultId: string, model: unknown): Promise<void> {
    await withHttpRetry(
      () =>
        this._client.apiV2TestResultsIdPut(testResultId, {
          testResultUpdateV2Request: model,
        }),
      { label: `apiV2TestResultsIdPut:${testResultId}` },
    );
  }

  private async getTestResults(skip: number, model: any): Promise<any> {
    return await this._client
      .apiV2TestResultsSearchPost({ skip: skip, take: this._testsLimit, testResultsFilterApiModel: model } as any)
      // @ts-ignore
      .then((response) => {
        const data = response.body || response;
        return data;
      })
      // @ts-ignore
      .catch((err) => {
        handleHttpError(err);

        return [];
      });
  }
}
