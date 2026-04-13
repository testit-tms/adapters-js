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

export default class TestItFormatter extends Formatter implements IFormatter {
  private static unhandledRejectionHandlerInstalled = false;
  private readonly strategy: IStrategy;
  private readonly additions: Additions;
  private readonly storage: IStorage;
  private readonly setupPromise: Promise<void>;

  private currentTestCaseId: string | undefined;
  private attachmentsQueue: Promise<void>[] = [];

  constructor(options: IFormatterOptions) {
    super(options);
    this.installUnhandledRejectionHandler();
    const config = new ConfigComposer().compose(options.parsedArgvOptions as AdapterConfig);
    this.strategy = StrategyFactory.create(config);
    this.additions = new Additions(config);
    this.storage = new Storage();
    this.setupPromise = this.strategy.setup();

    options.eventBroadcaster.on("envelope", (envelope: Envelope) => {
      void this.handleEnvelope(envelope).catch((err) => {
        console.error("Unhandled async error in Cucumber formatter envelope handler:", err?.body ?? err?.error ?? err);
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
      console.error("Unhandled promise rejection in Cucumber formatter:", normalized);
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
        const tags = parseTags(envelope.pickle.tags);

        for (const externalId of resolvedAutotests) {
          if (externalId === tags.externalId) {
            this.onPickle(envelope.pickle);
            return;
          }
        }
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
      this.testCaseFinished(envelope.testCaseFinished);
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

  testCaseFinished(testCaseFinished: TestCaseFinished): void {
    this.currentTestCaseId = undefined;
    this.storage.saveTestCaseFinished(testCaseFinished);
  }

  async onTestRunFinished(_testRunFinished: TestRunFinished): Promise<void> {
    try {
      await this.setupPromise;
      await this.strategy.testRunId;

      await Promise.allSettled(this.attachmentsQueue);

      const results = this.storage.getTestRunResults();
      const autotests = this.storage.getAutotests();

      await Promise.allSettled(
        autotests.map((autotestPost) => {
          const result = results.find((r) => r.autoTestExternalId === autotestPost.externalId);

          if (result !== undefined) {
            return this.strategy.loadAutotest(autotestPost, result.outcome).catch((err) => {
              console.error("Cucumber loadAutotest failed:", (err as any)?.body ?? (err as any)?.error ?? err);
            });
          }
          return Promise.resolve();
        }),
      );

      await this.strategy.loadTestRun(results).catch((err) => {
        console.error("Cucumber loadTestRun failed:", (err as any)?.body ?? (err as any)?.error ?? err);
      });

      await this.strategy.teardown().catch((err) => {
        console.error("Cucumber teardown failed:", (err as any)?.body ?? (err as any)?.error ?? err);
      });
    } catch (err) {
      console.error("Cucumber onTestRunFinished failed:", (err as any)?.body ?? (err as any)?.error ?? err);
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
          console.log("Error load attachments (attempt): \n", attachments, "\n", attempt, "\n", err);
          if (attempt < maxAttempts) {
            await new Promise((r) => setTimeout(r, 400 * attempt));
          }
        }
      }
      console.error("Error load attachments (gave up): \n", attachments, "\n", lastErr);
    })();

    this.attachmentsQueue.push(promise);
  }
}
