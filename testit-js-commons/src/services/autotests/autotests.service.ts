import {
  ApiV2AutoTestsSearchPostRequest,
  AutoTestModel,
  AutoTestsApi,
  AutoTestsApiApiKeys,
  AutotestFilterModel,
  AutotestsSelectModelIncludes } from "testit-api-client";
import { AdapterConfig } from "../../common";
import { BaseService } from "../base.service";
import { AutotestGet, AutotestPost, type IAutotestService } from "./autotests.type";
import { AutotestConverter, type IAutotestConverter } from "./autotests.converter";
import { handleHttpError } from "./autotests.handler";

const autotestApiKey = AutoTestsApiApiKeys["Bearer or PrivateToken"];

export class AutotestsService extends BaseService implements IAutotestService {
  protected _client: AutoTestsApi;
  protected _converter: IAutotestConverter;

  constructor(protected readonly config: AdapterConfig) {
    super(config);
    this._client = new AutoTestsApi(config.url);
    this._client.setApiKey(autotestApiKey, `PrivateToken ${config.privateToken}`);
    this._converter = new AutotestConverter(config);
  }

  public async createAutotest(autotest: AutotestPost): Promise<void> {
    const autotestPost = this._converter.toOriginAutotest(autotest);
    return await this._client
      .createAutoTest(autotestPost)
      .then(() => console.log(`Create autotest "${autotest.name}".`))
      .catch((err) => handleHttpError(err, `Failed create autotest "${autotestPost.name}"`));
  }

  public async updateAutotest(autotest: AutotestPost): Promise<void> {
    const autotestPost = this._converter.toOriginAutotest(autotest);
    await this._client
      .updateAutoTest(autotestPost)
      .then(() => console.log(`Update autotest "${autotest.name}".`))
      .catch((err) => handleHttpError(err, `Failed update autotest "${autotestPost.name}"`));
  }

  private async loadPassedAutotest(autotest: AutotestPost) {
    const originAutotest = await this.getAutotestByExternalId(autotest.externalId);
    !originAutotest ? await this.createAutotest(autotest) : await this.updateAutotest(autotest);
  }

  private async loadFailedAutotest(autotest: AutotestPost) {
    const originAutotest = await this.getAutotestByExternalId(autotest.externalId);

    !originAutotest
      ? await this.createAutotest(autotest)
      : await this.updateAutotest({
          ...originAutotest,
          externalId: originAutotest?.externalId ?? autotest.externalId,
          name: originAutotest?.name ?? autotest.name,
          links: autotest.links,
        });
  }

  public async loadAutotest(autotest: AutotestPost, isPassed: boolean): Promise<void> {
    isPassed ? await this.loadPassedAutotest(autotest) : await this.loadFailedAutotest(autotest);
  }

  public async linkToWorkItems(externalId: string, workItemsIds: Array<string>) {
    const internalId = await this.getAutotestByExternalId(externalId).then((test) => test?.id);

    if (internalId === undefined) {
      throw new Error(`Autotest with external id ${externalId} not found`);
    }

    const promises = workItemsIds.map((workItemId) =>
      this._client.linkAutoTestToWorkItem(internalId, { id: workItemId })
    );

    await Promise.all(promises).catch((err) => handleHttpError(err, "Failed link work item"));
  }

  public async getAutotestByExternalId(externalId: string): Promise<AutotestGet | null> {
    const filterModel: AutotestFilterModel = {
      externalIds: [externalId],
      projectIds: [this.config.projectId],
      isDeleted: false,
    };
    const includesModel: AutotestsSelectModelIncludes = {
      includeSteps: false,
      includeLinks: false,
      includeLabels: false
    };
    const requestModel: ApiV2AutoTestsSearchPostRequest = {
        filter: filterModel,
        includes: includesModel
    };

    return await this._client.apiV2AutoTestsSearchPost(
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      requestModel)
      .then(({ body }) => body[0])
      .then((autotest: AutoTestModel | undefined) => {
        return autotest ? this._converter.toLocalAutotest(autotest) : null;
      });
  }
}
