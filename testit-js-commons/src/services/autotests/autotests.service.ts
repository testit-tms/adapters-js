import {
  AutoTestApiResult,
  AutoTestsApi,
  AutoTestsApiApiKeys,
  AutoTestFilterApiModel, 
  WorkItemIdentifierModel} from "testit-api-client";
import { BaseService, AdapterConfig } from "../../common";
import { escapeHtmlInObject, escapeHtmlTags } from "../../common/utils";
import { AutotestGet, AutotestPost, type IAutotestService, Status } from "./autotests.type";
import { AutotestConverter, type IAutotestConverter } from "./autotests.converter";
import { handleHttpError } from "./autotests.handler";
import { AutoTestSearchApiModel } from "testit-api-client/dist/model/autoTestSearchApiModel";
import { AutoTestSearchIncludeApiModel } from "testit-api-client/dist/model/autoTestSearchIncludeApiModel";

const autotestApiKey = AutoTestsApiApiKeys["Bearer or PrivateToken"];

export class AutotestsService extends BaseService implements IAutotestService {
  protected _client: AutoTestsApi;
  protected _converter: IAutotestConverter;
  private MAX_TRIES: number = 10;
  private WAITING_TIME: number = 100;

  constructor(protected readonly config: AdapterConfig) {
    super(config);
    this._client = new AutoTestsApi(config.url);
    this._client.setApiKey(autotestApiKey, `PrivateToken ${config.privateToken}`);
    if (config.certValidation !== undefined) {
      this._client.setRejectUnauthorized(config.certValidation);
    }
    this._converter = new AutotestConverter(config);
  }

  public async createAutotest(autotest: AutotestPost): Promise<void> {
    const autotestPost = this._converter.toOriginAutotest(autotest);
    escapeHtmlInObject(autotestPost);
    
    return await this._client
      .createAutoTest(autotestPost)
      .then(() => console.log(`Create autotest "${autotest.name}".`))
      .catch((err) => handleHttpError(err, `Failed create autotest "${autotestPost.name}"`));
  }

  public async updateAutotest(autotest: AutotestPost): Promise<void> {
    const autotestPost = this._converter.toOriginAutotest(autotest);
    escapeHtmlInObject(autotestPost);
    
    await this._client
      .updateAutoTest(autotestPost)
      .then(() => console.log(`Update autotest "${autotest.name}".`))
      .catch((err) => handleHttpError(err, `Failed update autotest "${autotestPost.name}"`));
  }

  public async loadAutotest(autotest: AutotestPost, status: string): Promise<void> {
      const originAutotest = await this.getAutotestByExternalId(autotest.externalId);

      if (!originAutotest) {
          await this.createAutotest(autotest);
          return;
      }

      switch (status) {
        case Status.PASSED:
            await this.updateAutotest(autotest);
            return;
        case Status.FAILED:
            await this.updateAutotest({
                ...originAutotest,
                externalId: originAutotest?.externalId ?? autotest.externalId,
                name: originAutotest?.name ?? autotest.name,
                links: autotest.links,
                externalKey: autotest.externalKey,
            });
            return;
        case Status.SKIPPED:
            if (originAutotest.name != undefined && originAutotest.externalId != undefined) {
                await this.updateAutotest({
                    ...originAutotest,
                    externalId: originAutotest.externalId,
                    name: originAutotest.name,
                });
                return;
            }
            console.log(`Cannot update skipped autotest ${autotest.name} without name or externalId`);
            return;
        default:
            console.log(`Cannot update autotest ${autotest.name} with unknown status ${status}`);
      }
  }

  public async linkToWorkItems(internalId: string, workItemIds: Array<string>) {
    const promises = workItemIds.map(async (workItemId) => {
      for (var attempts = 0; attempts < this.MAX_TRIES; attempts++) {
        try {
          await this._client.linkAutoTestToWorkItem(internalId, { id: workItemId });
          console.log(`Link autotest ${internalId} to workitem ${workItemId} is successfully`);

          return;
        } catch (e) {
          console.log(`Cannot link autotest ${internalId} to work item ${workItemId}: ${e}`);
  
          await new Promise(f => setTimeout(f, this.WAITING_TIME));
        }
      }
    });

    await Promise.all(promises).catch((err) => handleHttpError(err, "Failed link work item"));
  }

  public async unlinkToWorkItem(internalId: string, workItemId: string): Promise<void> {
    for (var attempts = 0; attempts < this.MAX_TRIES; attempts++) {
      try {
        await this._client.deleteAutoTestLinkFromWorkItem(internalId, workItemId);
        console.log(`Unlink autotest ${internalId} from workitem ${workItemId} is successfully`);

        return;
      } catch (e) {
        console.log(`Cannot unlink autotest ${internalId} to work item ${workItemId}: ${e}`);

        await new Promise(f => setTimeout(f, this.WAITING_TIME));
      }
    }
  }

  public async getWorkItemsLinkedToAutoTest(internalId: string): Promise<Array<WorkItemIdentifierModel>> {
    return await this._client.getWorkItemsLinkedToAutoTest(
      internalId,
      undefined,
      undefined)
    .then((res) => res.body)
    .catch((e) => {
      console.log(`Cannot get linked workitems to autotest ${internalId}: ${e}`);

      return [];
    });
  }

  public async getAutotestByExternalId(externalId: string): Promise<AutotestGet | null> {
    const filterModel: AutoTestFilterApiModel = {
      externalIds: [externalId],
      projectIds: [this.config.projectId],
      isDeleted: false,
    };
    const includesModel: AutoTestSearchIncludeApiModel = {
      includeSteps: false,
      includeLinks: false,
      includeLabels: false
    };
    const requestModel: AutoTestSearchApiModel = {
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
      .then((autotest: AutoTestApiResult | undefined) => {
        return autotest ? this._converter.toLocalAutotest(autotest) : null;
      });
  }
}