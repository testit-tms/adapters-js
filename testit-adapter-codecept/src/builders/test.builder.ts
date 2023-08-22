import { useCompositeHash, useConfig, useDefaultHash, humanize } from "../common/utils";
import { Codecept, Origin } from "../types";
import { AdapterConfig, AutotestPost, ShortStep } from "testit-js-commons";

export class TestsBuilder {
  constructor(private readonly config: AdapterConfig) {}

  public build(test: Codecept.Test<Origin.TestConfig>): AutotestPost {
    const config = useConfig(test);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const { _beforeEach, _afterEach, _beforeAll, _afterAll } = test.parent;

    const teardown = [...this.reduceAfterOrBeforeSuites(_afterEach), ...this.reduceAfterOrBeforeSuites(_afterAll)];
    const setup = [...this.reduceAfterOrBeforeSuites(_beforeEach), ...this.reduceAfterOrBeforeSuites(_beforeAll)];

    return {
      title: config?.title,
      name: config?.displayName ?? test.title,
      labels: (config?.labels ?? []).map((label) => ({ name: label })),
      description: config?.description ?? "",
      steps: this.buildManySteps(test.steps),
      setup,
      links: config?.links ?? [],
      teardown,
      externalId: useDefaultHash(test) ?? useCompositeHash(test),
      namespace: config?.nameSpace,
      classname: config?.className,
    };
  }

  private buildManySteps(steps: Codecept.Step[] = []): ShortStep[] {
    return steps.map((step) => ({
      title: `${step.name}  ${humanize(step.args).join(",")}`.trim(),
      description: "",
    }));
  }

  private reduceAfterOrBeforeSuites(suite: Codecept.Test[]) {
    return suite.reduce((array, suite) => [...array, ...this.buildManySteps(suite?.steps ?? [])], []);
  }
}
