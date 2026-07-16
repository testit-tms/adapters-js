// @ts-ignore
import * as AdaptersApi from "../../adapters-api";
// @ts-ignore
import { AutoTestSearchIncludeApiModel, AutoTestSearchApiModel } from "../../adapters-api";

import { BaseService, AdapterConfig, escapeHtmlInObject, withHttpRetry } from "../../common";
import { AutotestGet, AutotestPost, type IAutotestService } from "./autotests.type";
import { AutotestConverter, type IAutotestConverter } from "./autotests.converter";
import { handleHttpError, isConflictError } from "./autotests.handler";
import logger from "../../logger";

export class AutotestsService extends BaseService implements IAutotestService {
  protected _client;
  protected _converter: IAutotestConverter;
  constructor(protected readonly config: AdapterConfig) {
    super(config);
    this._client = new AdaptersApi.AutoTestsApi();

    this._converter = new AutotestConverter(config);
  }

  public async createAutotest(autotest: AutotestPost): Promise<void> {
    const autotestPost = this._converter.toOriginAutotest(autotest);
    escapeHtmlInObject(autotestPost);

    logger.debug("[autotests] createAutoTest", { externalId: autotest.externalId, name: autotest.name });
    try {
      await withHttpRetry(
        () => this._client.adaptersAutoTestsPost({ autoTestCreateApiModel: autotestPost }),
        { label: "createAutoTest" },
      );
      logger.log(`Create autotest "${autotest.name}".`);
    } catch (err) {
      if (isConflictError(err)) {
        logger.debug("[autotests] createAutoTest skipped: already exists", {
          externalId: autotest.externalId,
          name: autotest.name,
        });
        return;
      }
      // @ts-ignore
      handleHttpError(err, `Failed create autotest "${autotestPost.name}"`);
      throw err;
    }
  }

  public async updateAutotest(autotest: AutotestPost): Promise<void> {
    const autotestPost = this._converter.toOriginAutotest(autotest);
    escapeHtmlInObject(autotestPost);

    logger.debug("[autotests] updateAutoTest", { externalId: autotest.externalId, name: autotest.name });
    await withHttpRetry(() => this._client
      .adaptersAutoTestsPut({ autoTestUpdateApiModel: autotestPost }), { label: "updateAutoTest" })
      .then(() => logger.log(`Update autotest "${autotest.name}".`))
      // @ts-ignore
      .catch((err) => handleHttpError(err, `Failed update autotest "${autotestPost.name}"`));
  }

  // sometimes status is lowercase
  public async loadAutotest(autotest: AutotestPost, status: string): Promise<void> {
    let originAutotest = await this.getAutotestByExternalId(autotest.externalId);

    if (!originAutotest) {
      logger.debug("[autotests] loadAutotest → create", { externalId: autotest.externalId, status });
      await this.createAutotest(autotest);
      originAutotest = await this.getAutotestByExternalId(autotest.externalId);
      if (!originAutotest) {
        logger.log(`Cannot load autotest "${autotest.name}": not found after create`);
        return;
      }
    } else {
      logger.debug("[autotests] loadAutotest → update path", { externalId: autotest.externalId, status });
    }

    const mergedAutotest: AutotestPost = {
      ...autotest,
      namespace: autotest.namespace ?? originAutotest.namespace,
      classname: autotest.classname ?? originAutotest.classname,
    };

    // fix the issue with lowercase status
    const currentStatus = status.toLowerCase();
    
    switch (currentStatus) {
      case "passed":
        await this.updateAutotest(mergedAutotest);
        return;
      case "failed":
        await this.updateAutotestFromFailed(originAutotest, mergedAutotest);
        return;
      case "skipped":
        if (originAutotest.name != undefined && originAutotest.externalId != undefined) {
          await this.updateAutotestFromFailed(originAutotest, mergedAutotest);
          return;
        }
        logger.log(`Cannot update skipped autotest ${autotest.name} without name or externalId`);
        return;
      default:
        logger.log(`Cannot update autotest ${autotest.name} with unknown status ${status}`);
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
      namespace: autotest.namespace ?? originAutotest.namespace,
      classname: autotest.classname ?? originAutotest.classname,
      labels: autotest.labels,
      tags: autotest.tags,
      workItemIds: autotest.workItemIds,
      isFlaky: autotest.isFlaky,
      shouldCreateWorkItem: autotest.shouldCreateWorkItem,
    });
  }

  public async linkToWorkItems(internalId: string, workItemIds: Array<string>) {
    const promises = workItemIds.map(async (workItemId) => {
      try {
        await this._client.adaptersAutoTestsIdWorkItemsPost(internalId, { workItemIdApiModel: { id: workItemId } });
        logger.log(`Link autotest ${internalId} to workitem ${workItemId} is successfully`);
      } catch (e: any) {
        logger.error(`Cannot link autotest ${internalId} to work item ${workItemId}`, e?.body ?? e?.error ?? e);
      }
    });

    await Promise.all(promises);
  }

  public async unlinkToWorkItem(internalId: string, workItemId: string): Promise<void> {
    try {
      await this._client.adaptersAutoTestsIdWorkItemsDelete(internalId, { workItemId: workItemId });
      logger.log(`Unlink autotest ${internalId} from workitem ${workItemId} is successfully`);
    } catch (e) {
      logger.log(`Cannot unlink autotest ${internalId} from work item ${workItemId}: ${e}`);
    }
  }

  public async getWorkItemsLinkedToAutoTest(internalId: string): Promise<Array<any>> {
    return await this._client
      .adaptersAutoTestsIdWorkItemsGet(internalId, {} as any)
      // @ts-ignore
      .then((res) => res?.body || res || [])
      // @ts-ignore
      .catch((e) => {
        logger.log(`Cannot get linked workitems to autotest ${internalId}: ${e}`);

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

    try {
      const response = await withHttpRetry(
        () => this._client.adaptersAutoTestsSearchPost({ autoTestSearchApiModel: requestModel } as any),
        { label: `searchAutoTest:${externalId}` },
      );
      // @ts-ignore
      const data = response?.body || response;
      const autotest = data ? data[0] : null;
      return autotest ? this._converter.toLocalAutotest(autotest) : null;
    } catch (reason: any) {
      logger.error("[autotests] getAutotestByExternalId failed", {
        externalId,
        code: reason?.code,
        status: reason?.status ?? reason?.statusCode,
      });
      return null;
    }
  }
}
