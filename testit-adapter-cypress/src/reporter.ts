import type Cypress from "cypress";
import { ConfigComposer, StrategyFactory, type IStrategy, Additions, type AdapterConfig, type Attachment, Link } from "testit-js-commons";
import type { TestData, StepData } from "./converter.js";
import { toAutotestPost, toAutotestResult } from "./converter.js";
import type {
  RuntimeMessage,
  TmsCypressConfig,
  TmsCypressTaskArgs,
  TmsSpecState,
  CypressFailMessage,
  CypressHookStartMessage,
  CypressSkippedTestMessage,
  CypressStepFinalizeMessage,
  CypressStepStartMessage,
  CypressStepStopMessage,
  CypressSuiteEndMessage,
  CypressSuiteStartMessage,
  CypressTestEndMessage,
  CypressTestSkipMessage,
  CypressTestStartMessage,
  Parameter,
  StatusDetails,
} from "./models/types.js";
import { DEFAULT_RUNTIME_CONFIG, last } from "./utils.js";
import { getRelativePath, getProjectRoot, parseTestPlan } from "./node-utils.js";
import { Status } from "./models/status.js";

interface TestItSpecContext {
  specPath: string;
  suiteNames: string[];
  currentTestData: TestData | null;
  completedTests: TestData[];
  stepsByFrontEndId: Map<string, StepData>;
  stepStack: StepData[];
  failed: boolean;
}

export class TmsCypress {
  private strategy: IStrategy;
  private additions: Additions;
  specContextByAbsolutePath = new Map<string, TestItSpecContext>();
  videoOnFailOnly = false;

  constructor(config: TmsCypressConfig = {}) {
    const { videoOnFailOnly = false, ...rest } = config;
    this.videoOnFailOnly = videoOnFailOnly;
    const adapterConfig = (rest as { tmsOptions?: AdapterConfig }).tmsOptions ?? rest as AdapterConfig;
    const composed = new ConfigComposer().compose(adapterConfig);
    this.strategy = StrategyFactory.create(composed);
    this.additions = new Additions(composed);
  }

  attachToCypress = (on: Cypress.PluginEvents) => {
    on("before:run", async () => {
      await this.strategy.setup();
    });

    on("task", {
      reportTmsCypressSpecMessages: async (args: TmsCypressTaskArgs) => {
        await this.#applySpecMessages(args);
        return null;
      },
      reportFinalTmsCypressSpecMessages: async (args: TmsCypressTaskArgs) => {
        await this.#applySpecMessages(args);
        if (args.isInteractive) {
          await this.endSpec(args.absolutePath);
        }
        return null;
      },
    });

    on("after:spec", this.onAfterSpec);
    on("after:run", async () => {
      await this.#endAllSpecs();
      await this.strategy.teardown();
    });
  };

  onAfterSpec = (spec: Cypress.Spec, results: CypressCommandLine.RunResult | undefined) => {
    this.endSpec(spec.absolute, results?.video ?? undefined);
  };

  endSpec = async (specAbsolutePath: string, cypressVideoPath?: string) => {
    const context = this.specContextByAbsolutePath.get(specAbsolutePath);
    if (!context) return;

    let videoAttachmentIds: string[] = [];
    if ((!this.videoOnFailOnly || context.failed) && cypressVideoPath) {
      try {
        const attachments = await this.additions.addAttachments([cypressVideoPath]);
        videoAttachmentIds = attachments.map((a: Attachment) => a.id);
      } catch {
        // ignore
      }
    }

    const posixSpecPath = getRelativePath(specAbsolutePath).replace(/\\/g, "/");

    const uniqueByFullName = new Map<string, TestData>();
    for (const t of context.completedTests) {
      uniqueByFullName.set(t.fullNameSuffix, t);
    }

    for (const t of uniqueByFullName.values()) {
      const autotest = toAutotestPost(posixSpecPath, t);
      await this.strategy.loadAutotest(autotest, t.outcome);
      const result = toAutotestResult(autotest.externalId, t, t.outcome, videoAttachmentIds);
      await this.strategy.loadTestRun([result]);
    }

    this.specContextByAbsolutePath.delete(specAbsolutePath);
  };

  #endAllSpecs = async () => {
    for (const path of Array.from(this.specContextByAbsolutePath.keys())) {
      await this.endSpec(path);
    }
  };

  #applySpecMessages = async ({ messages, absolutePath }: TmsCypressTaskArgs) => {
    if (messages.some((m) => m.type === "cypress_run_start")) {
      this.#startRun(absolutePath);
    }

    const context = this.specContextByAbsolutePath.get(absolutePath);
    if (!context) return;

    for (const message of messages) {
      if (message.type === "cypress_run_start") continue;

      switch (message.type) {
        case "cypress_suite_start":
          this.#startSuite(context, (message as CypressSuiteStartMessage).data);
          break;
        case "cypress_suite_end":
          this.#stopSuite(context, (message as CypressSuiteEndMessage).data);
          break;
        case "cypress_hook_start":
          this.#startHook(context, (message as CypressHookStartMessage).data);
          break;
        case "cypress_hook_end":
          this.#stopHook();
          break;
        case "cypress_test_start":
          this.#startTest(context, (message as CypressTestStartMessage).data);
          break;
        case "cypress_test_pass":
          this.#passTest(context);
          break;
        case "cypress_fail":
          this.#failTest(context, (message as CypressFailMessage).data);
          break;
        case "cypress_test_skip":
          this.#skipTest(context, (message as CypressTestSkipMessage).data);
          break;
        case "cypress_skipped_test":
          this.#addSkippedTest(context, (message as CypressSkippedTestMessage).data);
          break;
        case "cypress_test_end":
          this.#stopTest(context, (message as CypressTestEndMessage).data);
          break;
        case "cypress_step_start":
          this.#startStep(context, (message as CypressStepStartMessage).data);
          break;
        case "cypress_step_stop":
          this.#stopStep(context, (message as CypressStepStopMessage).data);
          break;
        case "cypress_step_finalize":
          this.#finalizeStep(context, (message as CypressStepFinalizeMessage).data);
          break;
        case "attachment_path":
          await this.#handleAttachmentPath(context, message.data as { name: string; path: string; contentType: string });
          break;
        case "attachment_content":
          await this.#handleAttachmentContent(context, message.data as { name: string; content: string; encoding: BufferEncoding; contentType: string });
          break;
        default:
          this.#applyRuntimeMessage(context, message);
          break;
      }
    }
  };

  #startRun = (absolutePath: string) => {
    const specPath = getRelativePath(absolutePath);
    const context: TestItSpecContext = {
      specPath,
      suiteNames: [],
      currentTestData: null,
      completedTests: [],
      stepsByFrontEndId: new Map(),
      stepStack: [],
      failed: false,
    };
    this.specContextByAbsolutePath.set(absolutePath, context);
  };

  #startSuite = (context: TestItSpecContext, data: { id: string; name: string; root: boolean }) => {
    if (!data.root) {
      context.suiteNames.push(data.name);
    }
  };

  #stopSuite = (context: TestItSpecContext, data: { root: boolean }) => {
    if (!data.root && context.suiteNames.length) {
      context.suiteNames.pop();
    }
  };

  #startHook = (context: TestItSpecContext, _data: { name: string; scopeType: string; position: string }) => {
    if (context.currentTestData) return;
    context.stepStack = [];
  };

  #stopHook = () => {}

  #startTest = (context: TestItSpecContext, data: CypressTestStartMessage["data"]) => {
    context.stepStack = [];
    context.stepsByFrontEndId.clear();
    context.currentTestData = {
      displayName: data.name,
      fullNameSuffix: data.fullNameSuffix,
      outcome: Status.PASSED,
      labels: data.labels ?? [],
      tags: data.tags ?? [],
      links: data.links ?? [],
      workItemIds: data.workItemIds ?? [],
      start: data.start,
      steps: [],
      attachmentIds: [],
      externalKey: data.fullNameSuffix,
    };
  };

  #passTest = (context: TestItSpecContext) => {
    if (context.currentTestData) context.currentTestData.outcome = Status.PASSED;
  };

  #failTest = (context: TestItSpecContext, data: CypressFailMessage["data"]) => {
    context.failed = true;
    if (context.currentTestData) {
      context.currentTestData.outcome = data.status === Status.SKIPPED ? Status.SKIPPED : Status.FAILED;
      context.currentTestData.statusDetails = data.statusDetails;
    }
  };

  #skipTest = (context: TestItSpecContext, data: CypressTestSkipMessage["data"]) => {
    if (context.currentTestData) {
      context.currentTestData.outcome = Status.SKIPPED;
      if (data.statusDetails) context.currentTestData.statusDetails = data.statusDetails;
    }
  };

  #addSkippedTest = (context: TestItSpecContext, data: CypressSkippedTestMessage["data"]) => {
    const alreadyAdded =
      context.completedTests.some((c) => c.fullNameSuffix === data.fullNameSuffix) ||
      (context.currentTestData?.fullNameSuffix === data.fullNameSuffix);
    if (alreadyAdded) return;

    const t: TestData = {
      displayName: data.name,
      fullNameSuffix: data.fullNameSuffix,
      labels: data.labels ?? [],
      tags: data.tags ?? [],
      links: data.links ?? [],
      workItemIds: data.workItemIds ?? [],
      outcome: Status.SKIPPED,
      duration: data.duration,
      statusDetails: data.statusDetails,
      steps: [],
      attachmentIds: [],
      externalKey: data.fullNameSuffix,
    };
    context.completedTests.push(t);
  };

  #stopTest = (context: TestItSpecContext, data: CypressTestEndMessage["data"]) => {
    if (context.currentTestData) {
      context.currentTestData.duration = data.duration;
      if (context.currentTestData.start != null) {
        context.currentTestData.stop = context.currentTestData.start + data.duration;
      }
      context.currentTestData.outcome ??= Status.PASSED;
      context.completedTests.push(context.currentTestData);
      context.currentTestData = null;
    }
    context.stepStack = [];
    context.stepsByFrontEndId.clear();
  };

  #startStep = (context: TestItSpecContext, data: CypressStepStartMessage["data"]) => {
    const step: StepData = {
      id: data.id,
      name: data.name,
      start: data.start,
      attachmentIds: [],
      children: [],
    };
    context.stepsByFrontEndId.set(data.id, step);

    if (!context.currentTestData) return;
    const parent = last(context.stepStack);
    if (parent) {
      parent.children.push(step);
    } else {
      context.currentTestData.steps.push(step);
    }
    context.stepStack.push(step);
  };

  #stopStep = (context: TestItSpecContext, data: CypressStepStopMessage["data"]) => {
    const step = context.stepsByFrontEndId.get(data.id);
    if (step) {
      step.stop = data.stop;
      step.status = data.status;
      step.statusDetails = data.statusDetails;
    }
    if (context.stepStack.length) context.stepStack.pop();
  };

  #finalizeStep = (context: TestItSpecContext, data: CypressStepFinalizeMessage["data"]) => {
    const step = context.stepsByFrontEndId.get(data.id);
    if (step) {
      if (data.name) step.name = data.name;
      if (data.statusDetails) step.statusDetails = data.statusDetails;
    }
    context.stepsByFrontEndId.delete(data.id);
  };

  #handleAttachmentPath = async (
    context: TestItSpecContext,
    data: { name: string; path: string; contentType: string },
  ) => {
    const target = last(context.stepStack) ?? context.currentTestData;
    if (!target) {
      return;
    }
    try {
      const attachments = await this.additions.addAttachments([data.path]);
      const ids = attachments.map((a: Attachment) => a.id);
      target.attachmentIds.push(...ids);
    } catch {
      // ignore
    }
  };

  #handleAttachmentContent = async (
    context: TestItSpecContext,
    data: { name: string; content: string; encoding: BufferEncoding; contentType: string },
  ) => {
    const target = last(context.stepStack) ?? context.currentTestData;
    if (!target) {
      return;
    }
    try {
      const buffer = Buffer.from(data.content, data.encoding);
      const attachments = await this.additions.addAttachments(buffer, data.name);
      const ids = attachments.map((a: Attachment) => a.id);
      target.attachmentIds.push(...ids);
    } catch {
      // ignore
    }
  };

  #applyRuntimeMessage = (context: TestItSpecContext, message: RuntimeMessage) => {
    if (message.type !== "metadata" || !context.currentTestData) return;
    const data = message.data as {
      labels?: Array<string>;
      links?: Array<Link>;
      workItemIds?: string[];
      tags?: string[];
      parameters?: Array<Parameter>;
      description?: string;
      displayName?: string;
      title?: string;
      namespace?: string;
      classname?: string;
      message?: string;
      details?: StatusDetails;
    };
    const current = context.currentTestData;

    if (data.labels?.length) {
      current.labels.push(...data.labels);
    }
    if (data.tags?.length) {
      current.tags.push(...data.tags);
    }
    if (data.workItemIds?.length) {
      current.workItemIds.push(...data.workItemIds);
    }
    if (data.links?.length) {
      current.links.push(...data.links);
    }
    if (data.parameters?.length) {
      current.parameters ??= {};
      for (const p of data.parameters) {
        current.parameters[p.name] = p.value;
      }
    }
    if (data.description) {
      current.description = data.description;
    }
    if (data.displayName) {
      current.displayName = data.displayName;
    }
    if (data.title) {
      current.title = data.title;
    }
    if (data.message) {
      current.message = data.message;
    }
    if (data.details) {
      current.statusDetails = data.details;
    }
    if (data.namespace) {
      current.namespace = data.namespace;
    }
    if (data.classname) {
      current.classname = data.classname;
    }
  };
}

const getRuntimeConfigDefaults = (config: TmsCypressConfig = {}): TmsSpecState["config"] => ({
  stepsFromCommands: {
    maxArgumentLength: config.stepsFromCommands?.maxArgumentLength ?? DEFAULT_RUNTIME_CONFIG.stepsFromCommands.maxArgumentLength,
    maxArgumentDepth: config.stepsFromCommands?.maxArgumentDepth ?? DEFAULT_RUNTIME_CONFIG.stepsFromCommands.maxArgumentDepth,
  },
});

const createRuntimeState = (config?: TmsCypressConfig): TmsSpecState => ({
  config: getRuntimeConfigDefaults(config),
  initialized: false,
  messages: [],
  testPlan: parseTestPlan(),
  projectDir: getProjectRoot(),
  stepStack: [],
  stepsToFinalize: [],
  nextApiStepId: 0,
});

const initializeRuntimeState = (cypressConfig: Cypress.PluginConfigOptions, config?: TmsCypressConfig) => {
  cypressConfig.env.tms = createRuntimeState(config);
  return cypressConfig;
};

export const tmsCypress = (
  on: Cypress.PluginEvents,
  cypressConfig?: Cypress.PluginConfigOptions,
  tmsConfig?: TmsCypressConfig,
) => {
  if (!tmsConfig && cypressConfig && !("env" in cypressConfig)) {
    tmsConfig = cypressConfig as TmsCypressConfig;
  }
  const hasCypressConfig = cypressConfig && "env" in cypressConfig;

  const reporter = new TmsCypress(tmsConfig);
  reporter.attachToCypress(on);

  if (hasCypressConfig) {
    initializeRuntimeState(cypressConfig, tmsConfig);
  }
  return reporter;
};
