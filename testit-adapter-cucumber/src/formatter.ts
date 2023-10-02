import { AdapterConfig, Client, ConfigComposer, IClient, IStrategy, Link, StrategyFactory } from "testit-js-commons";
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
  private readonly client: IClient;
  private readonly strategy: IStrategy;
  private readonly storage: IStorage;

  private currentTestCaseId: string | undefined;
  private attachmentsQueue: Promise<void>[] = [];

  constructor(options: IFormatterOptions) {
    super(options);
    const config = new ConfigComposer().compose(options.parsedArgvOptions as AdapterConfig);

    this.client = new Client(config);
    this.storage = new Storage();
    this.strategy = StrategyFactory.create(this.client, config);

    options.eventBroadcaster.on("envelope", async (envelope: Envelope) => {
      if (envelope.gherkinDocument) {
        return this.onGherkinDocument(envelope.gherkinDocument);
      }
      if (envelope.pickle) {
        const testsInRun = await this.strategy.testsInRun;

        const resolvedAutotests = testsInRun
          ?.map((test) => test.autoTest?.externalId)
          .filter((id): id is string => id !== undefined);

        if (resolvedAutotests !== undefined) {
          const tags = parseTags(envelope.pickle.tags);

          for (const externalId of resolvedAutotests) {
            if (externalId === tags.externalId) {
              return this.onPickle(envelope.pickle);
            }
          }

          envelope.pickle = undefined;
        } else {
          return this.onPickle(envelope.pickle);
        }
      }
      if (envelope.testCase) {
        return this.onTestCase(envelope.testCase);
      }
      if (envelope.testCaseStarted) {
        return this.onTestCaseStarted(envelope.testCaseStarted);
      }
      if (envelope.testStepStarted) {
        return this.testStepStarted(envelope.testStepStarted);
      }
      if (envelope.testStepFinished) {
        return this.onTestStepFinished(envelope.testStepFinished);
      }
      if (envelope.testCaseFinished) {
        return this.testCaseFinished(envelope.testCaseFinished);
      }
      if (envelope.testRunFinished) {
        return this.onTestRunFinished(envelope.testRunFinished);
      }
    });

    options.supportCodeLibrary.World.prototype.addMessage = this.addMessage.bind(this);
    options.supportCodeLibrary.World.prototype.addLinks = this.addLinks.bind(this);
    options.supportCodeLibrary.World.prototype.addAttachments = this.addAttachments.bind(this);
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
    await this.strategy.testRunId;

    await Promise.all(this.attachmentsQueue);

    const results = this.storage.getTestRunResults();
    const autotests = this.storage.getAutotests();

    await Promise.all(
      autotests.map((autotestPost) => {
        const result = results.find((result) => result.autoTestExternalId === autotestPost.externalId);

        if (result !== undefined) {
          return this.strategy.loadAutotest(autotestPost, result.outcome === "Passed");
        }
      })
    );

    await this.strategy.loadTestRun(results);

    await this.strategy.teardown();
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

    const promise = this.client.attachments
      .uploadAttachments(attachments)
      .then((ids) => {
        this.storage.addAttachments(currentTestCaseId, ids);
      })
      .catch((err) => {
        console.log("Error load attachments: \n", attachments, "\n", err);
      });

    this.attachmentsQueue.push(promise);
  }
}
