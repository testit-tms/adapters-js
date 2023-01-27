import { AutotestPost, AutotestStep } from 'testit-api-client';
import { humanize } from '../common/functions/humanize.function';
import { useCompositeHash, useConfig, useDefaultHash } from '../common/functions/use-hash.function';
import { Codecept } from '../types/codecept.type';
import { Origin } from '../types/origin.type';

export class TestsBuilder {
  constructor(private readonly config: Origin.Config) {
  }

  public build(test: Codecept.Test<Origin.TestConfig>): AutotestPost {
    const config = useConfig(test);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const { _beforeEach, _afterEach, _beforeAll, _afterAll } = test.parent;

    const teardown = [
      ...this.reduceAfterOrBeforeSuites(_afterEach),
      ...this.reduceAfterOrBeforeSuites(_afterAll)
    ];

    const setup = [
      ...this.reduceAfterOrBeforeSuites(_beforeEach),
      ...this.reduceAfterOrBeforeSuites(_beforeAll)
    ];

    return {
      title: config?.title,
      name: config?.displayName ?? test.title,
      projectId: this.config.projectId,
      labels: (config?.labels ?? []).map(label => ({ name: label })),
      description: config?.description ?? '',
      steps: this.buildManySteps(test.steps),
      setup,
      links: config?.links ?? [],
      teardown,
      externalId: useDefaultHash(test) ?? useCompositeHash(test)
    };
  }

  private buildManySteps(steps: Codecept.Step[] = []): AutotestStep[] {
    return steps
      .map(step => ({
        title: `${step.name}  ${humanize(step.args).join(',')}`.trim(),
        description: ''
      }));
  }

  private reduceAfterOrBeforeSuites(suite: Codecept.Test[]) {
    return suite
      .reduce((array, suite) => [
        ...array,
        ...this.buildManySteps(suite?.steps ?? [])
      ], []);
  }
}

