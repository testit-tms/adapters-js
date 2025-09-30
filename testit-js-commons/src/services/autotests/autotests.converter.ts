import { AutoTestModelV2GetModel, AutoTestApiResult, AutoTestPostModel } from "testit-api-client";
import { BaseConverter, AdapterConfig } from "../../common";
import { AutotestGet, AutotestPost } from "./autotests.type";

export interface IAutotestConverter {
  toOriginAutotest(autotest: AutotestPost): AutoTestPostModel;
  toLocalAutotest(autotest: AutoTestApiResult): AutotestGet;
  toLocalAutotestByModel(autotest: AutoTestModelV2GetModel): AutotestGet;
}

export class AutotestConverter extends BaseConverter implements IAutotestConverter {
  constructor(config: AdapterConfig) {
    super(config);
  }

  public toOriginAutotest(autotest: AutotestPost): AutoTestPostModel {
    return {
      ...autotest,
      workItemIds: [],
      projectId: this.config.projectId,
      links: Array.isArray(autotest.links) ? autotest.links.map((link) => this.toOriginLink(link)) : undefined,
      shouldCreateWorkItem: this.config.automaticCreationTestCases,
    };
  }

  public toLocalAutotestByModel(autotest: AutoTestModelV2GetModel): AutotestGet {
    return {
      id: autotest.id,
      name: autotest.name ?? undefined,
      externalId: autotest.externalId ?? undefined,
      links: autotest.links?.map((link) => this.toLocalLink(link)),
      namespace: autotest.namespace ?? undefined,
      classname: autotest.classname ?? undefined,
      steps: autotest.steps?.map((step) => this.toLocalShortStep(step)),
      setup: autotest.setup?.map((step) => this.toLocalShortStep(step)),
      teardown: autotest.teardown?.map((step) => this.toLocalShortStep(step)),
      labels: autotest.labels ?? undefined,
    };
  }

  public toLocalAutotest(autotest: AutoTestApiResult): AutotestGet {
    return {
      id: autotest.id,
      name: autotest.name ?? undefined,
      externalId: autotest.externalId ?? undefined,
      links: autotest.links?.map((link) => this.toLocalLink(link)),
      namespace: autotest.namespace ?? undefined,
      classname: autotest.classname ?? undefined,
      steps: autotest.steps?.map((step) => this.toLocalShortStep(step)),
      setup: autotest.setup?.map((step) => this.toLocalShortStep(step)),
      teardown: autotest.teardown?.map((step) => this.toLocalShortStep(step)),
      labels: autotest.labels ?? undefined,
    };
  }
}
