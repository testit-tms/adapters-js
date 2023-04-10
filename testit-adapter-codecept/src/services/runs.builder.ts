import { AttachmentPut, AutotestResultsForTestRun, AutotestStep } from 'testit-api-client';
import { OutcomeFactory, SomeOutcome } from '../common/classes/outcome.factory';
import { humanize } from '../common/functions/humanize.function';
import { safetyUseISOString } from '../common/functions/to-iso-string.function';
import { useCompositeHash, useDefaultHash } from '../common/functions/use-hash.function';
import { Codecept } from '../types/codecept.type';
import { Origin } from '../types/origin.type';

export class RunsBuilder {
  constructor(private readonly config: Origin.Config) {
  }

  public build(
    test: Codecept.Test<Origin.TestConfig>,
    metadata: Origin.TestMetadata,
    attachments: AttachmentPut[]
  ): AutotestResultsForTestRun {
    // @ts-ignore
    const { _beforeEach, _afterEach, _afterAll, _beforeAll } = test.parent;

    const parameters = test?.inject?.current?.toString
      ? JSON.parse(test?.inject?.current?.toString())
      : {};

    const teardownResults = [
      ...this.reduceAfterOrBeforeSuites(_afterEach),
      ...this.reduceAfterOrBeforeSuites(_afterAll)
    ];

    const setupResults = [
      ...this.reduceAfterOrBeforeSuites(_beforeEach),
      ...this.reduceAfterOrBeforeSuites(_beforeAll)
    ]

    return {
      configurationId: this.config.configurationId,
      autotestExternalId: useDefaultHash(test) ?? useCompositeHash(test),
      links: metadata?.links ?? [],
      startedOn: safetyUseISOString(test.startedAt),
      duration: test.duration,
      attachments,
      parameters,
      traces: test?.err?.cliMessage() ?? '',
      teardownResults,
      setupResults,
      completedOn: safetyUseISOString(test?.startedAt + test?.duration),
      message: metadata?.message ?? null,
      outcome: OutcomeFactory.create(test.state),
      stepResults: !OutcomeFactory.isSkipped(test.state) ? this.buildManySteps(test.steps) : null
    };
  }

  private buildManySteps(steps: Codecept.Step[]): AutotestStep[] {
    return steps?.map(step => ({
      title: `${step.name}  ${humanize(step.args).join(',')}`.trim(),
      outcome: OutcomeFactory.create(step.status as SomeOutcome),
      description: '',
      startedOn: safetyUseISOString(step.startedAt),
      duration: step.duration,
      completedOn: safetyUseISOString(step?.startedAt + step?.duration)
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
