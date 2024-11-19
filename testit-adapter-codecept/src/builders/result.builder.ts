import { AdapterConfig, Additions, Attachment, AutotestResult, Step } from "testit-js-commons";
import { humanize, useCompositeHash, useDefaultHash } from "../common/utils";
import { Codecept, Origin } from "../types";

export class ResultBuilder {
  additions: Additions;

  constructor(private readonly config: AdapterConfig) {
    this.additions = new Additions(config);
  }
  
  public async build(
    test: Codecept.Test<Origin.TestConfig>,
    metadata: Origin.TestMetadata,
  ): Promise<AutotestResult> {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const { _beforeEach, _afterEach, _afterAll, _beforeAll } = test.parent;

    const parameters = test?.inject?.current?.toString ? JSON.parse(test?.inject?.current?.toString()) : {};

    const teardownResults = [
      ...this.reduceAfterOrBeforeSuites(_afterEach),
      ...this.reduceAfterOrBeforeSuites(_afterAll),
    ];

    const setupResults = [
      ...this.reduceAfterOrBeforeSuites(_beforeEach),
      ...this.reduceAfterOrBeforeSuites(_beforeAll),
    ];

    return {
      autoTestExternalId: useDefaultHash(test) ?? useCompositeHash(test),
      links: metadata?.links,
      startedOn: new Date(test.startedAt),
      duration: test.duration,
      attachments: await this.loadAttachments(test, metadata),
      parameters,
      traces: typeof test?.err?.cliMessage === "function" ? test.err.cliMessage() : test?.err?.stack,
      teardownResults,
      setupResults,
      completedOn: test.duration ? new Date(test.startedAt + test.duration) : undefined,
      message: metadata?.message ?? null,
      outcome: test.state === "passed" ? "Passed" : "Failed",
      stepResults: this.buildManySteps(test.steps),
    };
  }

  private async loadAttachments(
    test: Codecept.Test<Origin.TestConfig>,
    metadata: Origin.TestMetadata
  ): Promise<Attachment[]> {
    const screenshot = test.artifacts?.screenshot;
    const clientUrls = metadata.attachments ?? [];

    if (screenshot) {
      clientUrls.push(screenshot);
    }

    const attachments = await this.additions.addAttachments(clientUrls);

    if (metadata?.text) {
      const attach = await this.additions.addAttachments(metadata.text.content, metadata.text?.name);
      attachments.push(...attach);
    }

    this.additions.clear();

    return attachments;
  }

  private buildManySteps(steps?: Codecept.Step[]): Step[] {
    return steps?.map((step) => ({
      title: `${step.name}  ${humanize(step.args).join(",")}`.trim(),
      outcome: step.status === "success" ? "Passed" : "Failed",
      description: "",
      startedOn: new Date(step.startedAt),
      duration: step.duration,
      completedOn: new Date(step.finishedAt),
    }));
  }

  private reduceAfterOrBeforeSuites(suite: Codecept.Test[]): Step[] {
    return suite.reduce((array, suite) => [...array, ...this.buildManySteps(suite?.steps ?? [])], []);
  }
}
