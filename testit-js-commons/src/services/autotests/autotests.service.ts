// @ts-ignore
import * as TestitApiClient from "testit-api-client";
// @ts-ignore
import { AutoTestSearchIncludeApiModel, AutoTestSearchApiModel } from "testit-api-client";

import { BaseService, AdapterConfig, escapeHtmlInObject } from "../../common";
import { AutotestGet, AutotestPost, type IAutotestService, Status } from "./autotests.type";
import { AutotestConverter, type IAutotestConverter } from "./autotests.converter";
import { handleHttpError } from "./autotests.handler";

export class AutotestsService extends BaseService implements IAutotestService {
  protected _client;
  protected _converter: IAutotestConverter;
  private MAX_TRIES: number = 10;
  private WAITING_TIME: number = 100;

  constructor(protected readonly config: AdapterConfig) {
    super(config);
    this._client = new TestitApiClient.AutoTestsApi();

    this._converter = new AutotestConverter(config);
  }

  public async createAutotest(autotest: AutotestPost): Promise<void> {
    const autotestPost = this._converter.toOriginAutotest(autotest);
    escapeHtmlInObject(autotestPost);

    return await this._client
      .createAutoTest({ autoTestCreateApiModel: autotestPost })
      .then(() => console.log(`Create autotest "${autotest.name}".`))
      // @ts-ignore
      .catch((err) => handleHttpError(err, `Failed create autotest "${autotestPost.name}"`));
  }

  public async updateAutotest(autotest: AutotestPost): Promise<void> {
    const autotestPost = this._converter.toOriginAutotest(autotest);
    escapeHtmlInObject(autotestPost);

    await this._client
      .updateAutoTest({ autoTestUpdateApiModel: autotestPost })
      .then(() => console.log(`Update autotest "${autotest.name}".`))
      // @ts-ignore
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
        await this.updateAutotestFromFailed(originAutotest, autotest);
        return;
      case Status.SKIPPED:
        if (originAutotest.name != undefined && originAutotest.externalId != undefined) {
          await this.updateAutotestFromFailed(originAutotest, autotest);
          return;
        }
        console.log(`Cannot update skipped autotest ${autotest.name} without name or externalId`);
        return;
      default:
        console.log(`Cannot update autotest ${autotest.name} with unknown status ${status}`);
    }
  }

  private async updateAutotestFromFailed(originAutotest: AutotestGet, autotest: AutotestPost): Promise<void> {
    await this.updateAutotest({
      ...originAutotest,
      externalId: originAutotest?.externalId ?? autotest.externalId,
      name: originAutotest?.name ?? autotest.name,
      links: autotest.links,
      externalKey: autotest.externalKey,
      steps: autotest.steps,
      setup: autotest.setup,
      teardown: autotest.teardown,
      title: autotest.title,
      description: autotest.description,
      namespace: autotest.namespace,
      classname: autotest.classname,
      labels: autotest.labels,
      tags: autotest.tags,
      workItemIds: autotest.workItemIds,
      isFlaky: autotest.isFlaky,
      shouldCreateWorkItem: autotest.shouldCreateWorkItem,
    });
  }

  public async linkToWorkItems(internalId: string, workItemIds: Array<string>) {
    const promises = workItemIds.map(async (workItemId) => {
      for (let attempts = 0; attempts < this.MAX_TRIES; attempts++) {
        try {
          await this._client.linkAutoTestToWorkItem(internalId, { workItemIdApiModel: { id: workItemId } });
          console.log(`Link autotest ${internalId} to workitem ${workItemId} is successfully`);

          return;
        // @ts-ignore
        } catch (e: any) {
          console.error(`Cannot link autotest ${internalId} to work item ${workItemId}`);
          // console.error(e);

          await new Promise((f) => setTimeout(f, this.WAITING_TIME));
        }
      }
    });

    await Promise.all(promises).catch((err) => handleHttpError(err, "Failed link work item"));
  }

  public async unlinkToWorkItem(internalId: string, workItemId: string): Promise<void> {
    for (let attempts = 0; attempts < this.MAX_TRIES; attempts++) {
      try {
        await this._client.deleteAutoTestLinkFromWorkItem(internalId, { workItemId: workItemId });
        console.log(`Unlink autotest ${internalId} from workitem ${workItemId} is successfully`);

        return;
      } catch (e) {
        console.log(`Cannot unlink autotest ${internalId} to work item ${workItemId}: ${e}`);

        await new Promise((f) => setTimeout(f, this.WAITING_TIME));
      }
    }
  }

  public async getWorkItemsLinkedToAutoTest(internalId: string): Promise<Array<any>> {
    return await this._client
      .getWorkItemsLinkedToAutoTest(internalId, {} as any)
      // @ts-ignore
      .then((res) => res.body)
      // @ts-ignore
      .catch((e) => {
        console.log(`Cannot get linked workitems to autotest ${internalId}: ${e}`);

        return [];
      });
  }

  public async getAutotestByExternalId(externalId: string): Promise<AutotestGet | null> {
    const filterModel = {
      externalIds: [externalId],
      projectIds: [this.config.projectId],
      isDeleted: false,
    };
    const includesModel: AutoTestSearchIncludeApiModel = {
      includeSteps: false,
      includeLinks: false,
      includeLabels: false,
    };
    const requestModel: AutoTestSearchApiModel = {
      filter: filterModel,
      includes: includesModel,
    };

    return await this._client
      .apiV2AutoTestsSearchPost({ autoTestSearchApiModel: requestModel } as any)
      // @ts-ignore
      .then((response) => {
        const data = response.body || response;
        return data ? data[0] : null;
      })
      .then((autotest: any | undefined) => {
        return autotest ? this._converter.toLocalAutotest(autotest) : null;
      })
      .catch((reason) => {
        console.error(reason);
        return null;
      });
  }
}
