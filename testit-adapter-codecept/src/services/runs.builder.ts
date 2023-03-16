import {
  AttachmentPutModel,
  AutoTestResultsForTestRunModel,
  AttachmentPutModelAutoTestStepResultsModel,
  AvailableTestResultOutcome,
  LinkPostModel,
  LinkType
} from 'testit-api-client';
import { OutcomeFactory, SomeOutcome } from '../common/classes/outcome.factory';
import { humanize } from '../common/functions/humanize.function';
import { useCompositeHash, useDefaultHash } from '../common/functions/use-hash.function';
import { Codecept } from '../types/codecept.type';
import { Origin } from '../types/origin.type';

export class RunsBuilder {
  constructor(private readonly config: Origin.Config) {
  }

  public build(
    test: Codecept.Test<Origin.TestConfig>,
    metadata: Origin.TestMetadata,
    attachments: AttachmentPutModel[]
  ): AutoTestResultsForTestRunModel {
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
      autoTestExternalId: useDefaultHash(test) ?? useCompositeHash(test),
      links: this.buildLinks(metadata?.links),
      startedOn: test?.startedAt ? new Date(test?.startedAt) : undefined,
      duration: test?.duration ?? 0,
      attachments,
      parameters,
      traces: test?.err?.cliMessage() ?? '',
      teardownResults,
      setupResults,
      completedOn: test?.startedAt && test?.duration ? new Date(test?.startedAt + test?.duration) : undefined,
      message: metadata?.message ?? null,
      outcome: AvailableTestResultOutcome[OutcomeFactory.create(test.state)],
      stepResults: !OutcomeFactory.isSkipped(test.state) ? this.buildManySteps(test.steps) : null
    };
  }

  private buildManySteps(steps: Codecept.Step[]): AttachmentPutModelAutoTestStepResultsModel[] {
    return steps?.map(step => ({
      title: `${step.name}  ${humanize(step.args).join(',')}`.trim(),
      outcome: AvailableTestResultOutcome[OutcomeFactory.create(step.status as SomeOutcome)],
      description: '',
      startedOn: step?.startedAt ? new Date(step?.startedAt) : undefined,
      duration: step.duration ?? 0,
      completedOn: step?.startedAt && step?.duration ? new Date(step?.startedAt + step?.duration) : undefined
    }));
  }

  private buildLinks(links: Origin.LinkPost[]): LinkPostModel[] {
    return links?.map(link => {
      const model = new LinkPostModel();

      model.url = link.url;
      model.title = link.title;
      model.description = link.description;

      if (link.type !== undefined) {
          model.type = LinkType[link.type];
      }

      return model;
    });
  }

  private reduceAfterOrBeforeSuites(suite: Codecept.Test[]) {
    return suite
      .reduce((array, suite) => [
        ...array,
        ...this.buildManySteps(suite?.steps ?? [])
      ], []);
  }
}
