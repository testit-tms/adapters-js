import { AdapterConfig, Additions, ConfigComposer, IStrategy, Link, StrategyFactory } from "testit-js-commons";
import { Formatter, IFormatterOptions } from "@cucumber/cucumber";
import {
  Envelope,
  GherkinDocument,
  Pickle,
  TestCase,
  TestStepFinished,
  TestRunFinished,
  TestCaseStarted,
  TestCaseFinished,
  TestStepStarted,
} from "@cucumber/messages";
import { IStorage, IFormatter } from "./types";
import { Storage } from "./storage";
import { parseTags } from "./utils";
import { logger } from "testit-js-commons";


export default class TestItFormatter extends Formatter implements IFormatter {
  private static unhandledRejectionHandlerInstalled = false;
  private readonly strategy: IStrategy;
  private readonly additions: Additions;
  private readonly storage: IStorage;
  private readonly setupPromise: Promise<void>;
  private readonly importRealtime: boolean;
  /** One TMS publish per Cucumber test execution (testCaseStarted.id). */
  private readonly sentTestCaseStartedIds = new Set<string>();
  private realtimeSendChain: Promise<void> = Promise.resolve();

  private currentTestCaseId: string | undefined;
  private attachmentsQueue: Promise<void>[] = [];

  constructor(options: IFormatterOptions) {
    super(options);
    this.installUnhandledRejectionHandler();
    const config = new ConfigComposer().compose(options.parsedArgvOptions as AdapterConfig);
    this.importRealtime = Boolean(config.importRealtime);
    logger.debug("[cucumber] formatter init", { importRealtime: this.importRealtime });
    this.strategy = StrategyFactory.create(config);
    this.additions = new Additions(config);
    this.storage = new Storage();
    this.setupPromise = this.strategy.setup();

    options.eventBroadcaster.on("envelope", (envelope: Envelope) => {
      void this.handleEnvelope(envelope).catch((err) => {
        logger.error("Unhandled async error in Cucumber formatter envelope handler:", err?.body ?? err?.error ?? err);
      });
    });

    options.supportCodeLibrary.World.prototype.addMessage = this.addMessage.bind(this);
    options.supportCodeLibrary.World.prototype.addLinks = this.addLinks.bind(this);
    options.supportCodeLibrary.World.prototype.addAttachments = this.addAttachments.bind(this);
  }

  private installUnhandledRejectionHandler() {
    if (TestItFormatter.unhandledRejectionHandlerInstalled) {
      return;
    }
    TestItFormatter.unhandledRejectionHandlerInstalled = true;
    process.on("unhandledRejection", (reason: unknown) => {
      const normalized = (reason as any)?.body ?? (reason as any)?.error ?? reason;
      logger.error("Unhandled promise rejection in Cucumber formatter:", normalized);
    });
  }

  private async handleEnvelope(envelope: Envelope): Promise<void> {
    if (envelope.gherkinDocument) {
      this.onGherkinDocument(envelope.gherkinDocument);
      return;
    }
    if (envelope.pickle) {
      const resolvedAutotests = await this.strategy.testsInRun;

      if (resolvedAutotests !== undefined) {
        this.onPickle(envelope.pickle);
        const pickleExternalId = this.storage.resolvePickleExternalId(envelope.pickle);

        for (const resolvedExternalId of resolvedAutotests) {
          if (resolvedExternalId === pickleExternalId) {
            return;
          }
        }
        return;
      } else {
        this.onPickle(envelope.pickle);
        return;
      }
    }
    if (envelope.testCase) {
      this.onTestCase(envelope.testCase);
      return;
    }
    if (envelope.testCaseStarted) {
      this.onTestCaseStarted(envelope.testCaseStarted);
      return;
    }
    if (envelope.testStepStarted) {
      this.testStepStarted(envelope.testStepStarted);
      return;
    }
    if (envelope.testStepFinished) {
      this.onTestStepFinished(envelope.testStepFinished);
      return;
    }
    if (envelope.testCaseFinished) {
      await this.testCaseFinished(envelope.testCaseFinished);
      return;
    }
    if (envelope.testRunFinished) {
      await this.onTestRunFinished(envelope.testRunFinished);
    }
  }

  onGherkinDocument(document: GherkinDocument): void {
    this.storage.saveGherkinDocument(document);
  }

  onPickle(pickle: Pickle): void {
    this.storage.savePickle(pickle);
  }

  onTestCase(testCase: TestCase): void {
    this.storage.saveTestCase(testCase);
  }

  onTestCaseStarted(testCaseStarted: TestCaseStarted): void {
    this.currentTestCaseId = testCaseStarted.testCaseId;
    this.storage.saveTestCaseStarted(testCaseStarted);
  }

  testStepStarted(testStepStarted: TestStepStarted): void {
    this.storage.saveTestStepStarted(testStepStarted);
  }

  onTestStepFinished(testStepFinished: TestStepFinished): void {
    this.storage.saveTestStepFinished(testStepFinished);
  }

  async testCaseFinished(testCaseFinished: TestCaseFinished): Promise<void> {
    this.currentTestCaseId = undefined;
    this.storage.saveTestCaseFinished(testCaseFinished);
    if (this.importRealtime) {
      await this.enqueueRealtimeSend(testCaseFinished.testCaseStartedId);
    }
  }

  async onTestRunFinished(_testRunFinished: TestRunFinished): Promise<void> {
    try {
      await this.setupPromise;
      await this.strategy.testRunId;

      await Promise.allSettled(this.attachmentsQueue);

      if (this.importRealtime) {
        await this.realtimeSendChain;
        await this.catchUpRealtimeResults();
      } else {
        logger.debug("[cucumber] onTestRunFinished batch");
        const results = this.storage.getTestRunResults();
        const autotests = this.storage.getAutotests();

        await Promise.allSettled(
          autotests.map((autotestPost) => {
            const result = results.find((r) => r.autoTestExternalId === autotestPost.externalId);

            if (result !== undefined) {
              return this.strategy.loadAutotest(autotestPost, result.outcome).catch((err) => {
                logger.error("Cucumber loadAutotest failed:", (err as any)?.body ?? (err as any)?.error ?? err);
              });
            }
            return Promise.resolve();
          }),
        );

        await this.strategy.loadTestRun(results).catch((err) => {
          logger.error("Cucumber loadTestRun failed:", (err as any)?.body ?? (err as any)?.error ?? err);
        });
      }

      await this.strategy.teardown().catch((err) => {
        logger.error("Cucumber teardown failed:", (err as any)?.body ?? (err as any)?.error ?? err);
      });
    } catch (err) {
      logger.error("Cucumber onTestRunFinished failed:", (err as any)?.body ?? (err as any)?.error ?? err);
    }
  }

  addMessage(message: string): void {
    if (this.currentTestCaseId === undefined) {
      throw new Error("CurrentTestCaseId is not set");
    }

    this.storage.addMessage(this.currentTestCaseId, message);
  }

  addLinks(links: Link[]): void {
    if (this.currentTestCaseId === undefined) {
      throw new Error("CurrentTestCaseId is not set");
    }

    this.storage.addLinks(this.currentTestCaseId, links);
  }

  addAttachments(attachments: string[]): void {
    if (this.currentTestCaseId === undefined) {
      throw new Error("CurrentTestCaseId is not a set");
    }

    const currentTestCaseId = this.currentTestCaseId;

    const promise = (async () => {
      const maxAttempts = 3;
      let lastErr: unknown;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          // @ts-ignore — overload: string[]
          const ids = await this.additions.addAttachments(attachments);
          this.storage.addAttachments(currentTestCaseId, ids);
          return;
        } catch (err) {
          lastErr = err;
          logger.debug("[cucumber] attachment upload retry", { attempt, attachments });
          logger.log("Error load attachments (attempt): \n", attachments, "\n", attempt, "\n", err);
          if (attempt < maxAttempts) {
            await new Promise((r) => setTimeout(r, 400 * attempt));
          }
        }
      }
      logger.error("Error load attachments (gave up): \n", attachments, "\n", lastErr);
    })();

    this.attachmentsQueue.push(promise);
  }

  private enqueueRealtimeSend(testCaseStartedId: string): Promise<void> {
    const task = this.realtimeSendChain.then(() => this.publishRealtimeResult(testCaseStartedId));
    this.realtimeSendChain = task.catch(() => undefined);
    return task;
  }

  private async publishRealtimeResult(testCaseStartedId: string): Promise<void> {
    if (this.sentTestCaseStartedIds.has(testCaseStartedId)) {
      logger.debug("[cucumber] realtime skip: already sent", { testCaseStartedId });
      return;
    }

    await Promise.allSettled(this.attachmentsQueue);

    const payload = this.storage.getRealtimePayload(testCaseStartedId);
    if (payload === undefined) {
      logger.debug("[cucumber] realtime skip: not ready", { testCaseStartedId });
      return;
    }

    this.sentTestCaseStartedIds.add(testCaseStartedId);
    const { autotest, result } = payload;
    logger.debug("[cucumber] realtime send", {
      testCaseStartedId,
      externalId: autotest.externalId,
      outcome: result.outcome,
    });

    try {
      await this.strategy.loadAutotest(autotest, result.outcome);
      await this.strategy.loadTestRun([result]);
    } catch (err) {
      this.sentTestCaseStartedIds.delete(testCaseStartedId);
      logger.error("Cucumber realtime publish failed:", (err as any)?.body ?? (err as any)?.error ?? err);
      throw err;
    }
  }

  private async catchUpRealtimeResults(): Promise<void> {
    const pending = this.storage.listCatchUpRealtimePayloads(this.sentTestCaseStartedIds);
    logger.debug("[cucumber] catch-up realtime", { pending: pending.length, sent: this.sentTestCaseStartedIds.size });
    for (const { testCaseStartedId } of pending) {
      await this.publishRealtimeResult(testCaseStartedId);
    }
  }
}
