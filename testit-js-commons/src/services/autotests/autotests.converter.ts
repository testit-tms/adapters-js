import { BaseConverter, AdapterConfig } from "../../common";
import { AutotestGet, AutotestPost } from "./autotests.type";

export interface IAutotestConverter {
  toOriginAutotest(autotest: AutotestPost): any;
  toLocalAutotest(autotest: any): AutotestGet;
}

export class AutotestConverter extends BaseConverter implements IAutotestConverter {
  constructor(config: AdapterConfig) {
    super(config);
  }

  public toOriginAutotest(autotest: AutotestPost): any {
    return {
      externalId: autotest.externalId,
      name: autotest.name,
      namespace: autotest.namespace,
      classname: autotest.classname,
      steps: autotest.steps,
      setup: autotest.setup,
      teardown: autotest.teardown,
      labels: autotest.labels,
      tags: autotest.tags,
      externalKey: autotest.externalKey,
      title: autotest.title,
      description: autotest.description,
      isFlaky: autotest.isFlaky,
      projectId: this.config.projectId,
      links: Array.isArray(autotest.links) ? autotest.links.map((link) => this.toOriginLink(link)) : undefined,
      shouldCreateWorkItem: this.config.automaticCreationTestCases,
    };
  }

  public toLocalAutotest(autotest: any): AutotestGet {
    return {
      id: autotest.id,
      name: autotest.name ?? undefined,
      externalId: autotest.externalId ?? undefined,
      links: autotest.links?.map((link: any) => this.toLocalLink(link)),
      namespace: autotest.namespace ?? undefined,
      classname: autotest.classname ?? undefined,
      steps: autotest.steps?.map((step: any) => this.toLocalShortStep(step)),
      setup: autotest.setup?.map((step: any) => this.toLocalShortStep(step)),
      teardown: autotest.teardown?.map((step: any) => this.toLocalShortStep(step)),
      labels: autotest.labels ?? undefined,
      tags: autotest.tags ?? undefined,
    };
  }
}
