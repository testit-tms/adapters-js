// @ts-ignore
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
      externalId: autotest.externalId,
      name: autotest.name,
      namespace: autotest.namespace,
      classname: autotest.classname,
      steps: autotest.steps,
      setup: autotest.setup,
      teardown: autotest.teardown,
      labels: autotest.labels,
      externalKey: autotest.externalKey,
      title: autotest.title,
      description: autotest.description,
      isFlaky: autotest.isFlaky,
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
      // @ts-ignore
      links: autotest.links?.map((link) => this.toLocalLink(link)),
      namespace: autotest.namespace ?? undefined,
      classname: autotest.classname ?? undefined,
      // @ts-ignore
      steps: autotest.steps?.map((step) => this.toLocalShortStep(step)),
      // @ts-ignore
      setup: autotest.setup?.map((step) => this.toLocalShortStep(step)),
      // @ts-ignore
      teardown: autotest.teardown?.map((step) => this.toLocalShortStep(step)),
      labels: autotest.labels ?? undefined,
    };
  }

  public toLocalAutotest(autotest: AutoTestApiResult): AutotestGet {
    return {
      id: autotest.id,
      name: autotest.name ?? undefined,
      externalId: autotest.externalId ?? undefined,
      // @ts-ignore
      links: autotest.links?.map((link) => this.toLocalLink(link)),
      namespace: autotest.namespace ?? undefined,
      classname: autotest.classname ?? undefined,
      // @ts-ignore
      steps: autotest.steps?.map((step) => this.toLocalShortStep(step)),
      // @ts-ignore
      setup: autotest.setup?.map((step) => this.toLocalShortStep(step)),
      // @ts-ignore
      teardown: autotest.teardown?.map((step) => this.toLocalShortStep(step)),
      labels: autotest.labels ?? undefined,
    };
  }
}
