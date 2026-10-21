import { AdapterConfig, Additions, Attachment, AutotestResult, Step } from "testit-js-commons";
import { humanize, useCompositeHash, useDefaultHash } from "../common/utils";
import { Codecept, Origin } from "../types";
import { logger } from "testit-js-commons";


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

    let traces = typeof test?.err?.cliMessage === "function" ? test.err.cliMessage() : test?.err?.stack;
    let message = metadata?.message ?? null;
    // If TMS_IS_CI env is true, trim traces and message to 20 chars and log this
    if (process.env.TMS_IS_CI === "true") {
      if (typeof traces === "string" && traces.length > 20) {
        logger.log("TMS_IS_CI is true: trimming traces to 20 chars");
        traces = traces.slice(0, 20);
      }
      if (typeof message === "string" && message.length > 20) {
        logger.log("TMS_IS_CI is true: trimming message to 20 chars");
        message = message.slice(0, 20);
      }
    }

    // Snapshot mutable Codecept fields before any await — next tests may overwrite test.steps.
    const autoTestExternalId = useDefaultHash(test) ?? useCompositeHash(test);
    const startedOn = new Date(test.startedAt);
    const duration = test.duration;
    const completedOn = test.duration ? new Date(test.startedAt + test.duration) : undefined;
    const outcome = test.state === "passed" ? "Passed" : "Failed";
    const stepResults = this.buildManySteps(test.steps);
    const screenshot = test.artifacts?.screenshot;

    const attachments = await this.loadAttachments(metadata, screenshot);

    return {
      autoTestExternalId,
      links: metadata?.links,
      startedOn,
      duration,
      attachments,
      parameters,
      traces,
      teardownResults,
      setupResults,
      completedOn,
      message,
      outcome,
      stepResults,
    };
  }

  private async loadAttachments(
    metadata: Origin.TestMetadata,
    screenshot?: string,
  ): Promise<Attachment[]> {
    const clientUrls = [...(metadata.attachments ?? [])];

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
    return steps?.map((step) => {
      const humanizedArgs = humanize(step.args);

      return {
        title: `${step.name}  ${humanizedArgs.join(",")}`.trim(),
        outcome: step.status === "success" ? "Passed" : "Failed",
        description: "",
        startedOn: new Date(step.startedAt),
        duration: step.duration,
        completedOn: new Date(step.finishedAt),
      };
    });
  }

  private reduceAfterOrBeforeSuites(suite: Codecept.Test[]): Step[] {
    return suite.reduce((array, suite) => [...array, ...this.buildManySteps(suite?.steps ?? [])], []);
  }
}
