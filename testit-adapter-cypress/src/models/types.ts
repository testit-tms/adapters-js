import type { Label, Link, Status } from "testit-js-commons";

export interface Parameter {
  name: string;
  value: string;
}

export interface StatusDetails {
  message?: string;
  trace?: string;
  actual?: string;
  expected?: string;
}

export type ReporterConfig = {
  resultsDir?: string;
};

export type TmsCypressConfig = ReporterConfig & {
  videoOnFailOnly?: boolean;
  stepsFromCommands?: Partial<TmsSpecState["config"]["stepsFromCommands"]>;
};

export type CypressSuite = Mocha.Suite & {
  id: string;
  parent: CypressSuite | undefined;
  tests: CypressTest[];
  suites: CypressSuite[];
};

export type CypressTest = Mocha.Test & {
  wallClockStartedAt?: Date;
  parent: CypressSuite | undefined;
};

export type CypressHook = Mocha.Hook & {
  hookId: string;
  hookName: string;
  parent: CypressSuite | undefined;
};

export type CypressCommand = {
  attributes: {
    name: string;
    id: string;
    args: any[];
  };
  state: "passed" | "failed" | "queued";
};

export type CypressRenderProps = { message?: string };

export type CypressConsoleProps = {
  name: string;
  props: Record<string, unknown>;
};

export type CypressLogEntry = ReturnType<typeof Cypress.log> & {
  attributes: {
    id: string;
    error?: Error;
    name: string;
    message: string;
    displayName?: string;
    event: boolean;
    type: string;
    instrument: string;
    groupStart: boolean;
    createdAtTimestamp: number;
    updatedAtTimestamp: number;
    end?: boolean;
    renderProps: (() => CypressRenderProps) | CypressRenderProps;
    consoleProps: (() => CypressConsoleProps) | CypressConsoleProps;
  };
  endGroup: () => unknown;
};

export type CupressRunStart = {
  type: "cypress_run_start";
  data: object;
};

export type CypressSuiteStartMessage = {
  type: "cypress_suite_start";
  data: {
    id: string;
    name: string;
    root: boolean;
    start: number;
  };
};

export type CypressSuiteEndMessage = {
  type: "cypress_suite_end";
  data: {
    root: boolean;
    stop: number;
  };
};

export type CypressHookStartMessage = {
  type: "cypress_hook_start";
  data: {
    name: string;
    scopeType: "each" | "all";
    position: "before" | "after";
    start: number;
  };
};

export type CypressHookEndMessage = {
  type: "cypress_hook_end";
  data: {
    duration: number;
  };
};

export type CypressTestStartMessage = {
  type: "cypress_test_start";
  data: {
    name: string;
    fullNameSuffix: string;
    start: number;
    labels: string[];
    tags: string[];
    links: Link[];
    workItemIds: string[];
  };
};

export type CypressFailMessage = {
  type: "cypress_fail";
  data: {
    status: Status;
    statusDetails: StatusDetails;
  };
};

export type CypressTestSkipMessage = {
  type: "cypress_test_skip";
  data: {
    statusDetails?: StatusDetails;
  };
};

export type CypressTestPassMessage = {
  type: "cypress_test_pass";
  data: object;
};

export type CypressSkippedTestMessage = {
  type: "cypress_skipped_test";
  data: CypressTestStartMessage["data"] &
    CypressFailMessage["data"] &
    CypressTestEndMessage["data"] & {
      suites: string[];
    };
};

export type CypressTestEndMessage = {
  type: "cypress_test_end";
  data: {
    duration: number;
    retries: number;
  };
};

export type CypressStepStartMessage = {
  type: "cypress_step_start";
  data: {
    id: string;
    name: string;
    start: number;
  };
};

export type CypressStepStopMessage = {
  type: "cypress_step_stop";
  data: {
    id: string;
    status: Status;
    statusDetails?: StatusDetails;
    stop: number;
  };
};

export type CypressStepFinalizeMessage = {
  type: "cypress_step_finalize";
  data: {
    id: string;
    name?: string;
    parameters?: Parameter[];
    statusDetails?: StatusDetails;
  };
};

type RuntimeMessageBase<T extends string> = { type: T };

export type RuntimeMetadataMessage = RuntimeMessageBase<"metadata"> & {
  data: {
    labels?: Label[];
    links?: Link[];
    tags?: string[];
    workItemIds?: string[];
    parameters?: Parameter[];
    description?: string;
    displayName?: string;
    title?: string;
    namespace?: string;
    classname?: string;
  };
};

export type RuntimeStartStepMessage = RuntimeMessageBase<"step_start"> & {
  data: { name: string; start: number };
};

export type RuntimeStopStepMessage = RuntimeMessageBase<"step_stop"> & {
  data: { stop: number; status: Status; statusDetails?: StatusDetails };
};

export type RuntimeAttachmentContentMessage = RuntimeMessageBase<"attachment_content"> & {
  data: {
    name: string;
    content: string;
    encoding: BufferEncoding;
    contentType: string;
    fileExtension?: string;
  };
};

export type RuntimeAttachmentPathMessage = RuntimeMessageBase<"attachment_path"> & {
  data: { name: string; path: string; contentType: string; fileExtension?: string };
};

export type RuntimeMessage =
  | RuntimeMetadataMessage
  | RuntimeStartStepMessage
  | RuntimeStopStepMessage
  | RuntimeAttachmentContentMessage
  | RuntimeAttachmentPathMessage
  | (RuntimeMessageBase<string> & { data?: unknown });

export interface TestPlanV1 {
  version: "1.0";
  tests: Array<{ id?: string | number; selector?: string }>;
}

export type CypressMessage =
  | Exclude<RuntimeMessage, RuntimeStartStepMessage | RuntimeStopStepMessage>
  | CupressRunStart
  | CypressSuiteStartMessage
  | CypressSuiteEndMessage
  | CypressHookStartMessage
  | CypressHookEndMessage
  | CypressTestStartMessage
  | CypressStepStartMessage
  | CypressStepStopMessage
  | CypressStepFinalizeMessage
  | CypressTestPassMessage
  | CypressFailMessage
  | CypressTestSkipMessage
  | CypressSkippedTestMessage
  | CypressTestEndMessage;

export type SpecContext = {
  specPath: string;
  test: string | undefined;
  fixture: string | undefined;
  stepsByFrontEndId: Map<string, string>;
  videoScope: string;
  suiteIdToScope: Map<string, string>;
  suiteScopeToId: Map<string, string>;
  suiteScopes: string[];
  testScope: string | undefined;
  suiteNames: string[];
  failed: boolean;
};

type StepDescriptorBase = {
  id: string;
  error?: Error;
};

export type LogStepDescriptor = StepDescriptorBase & {
  type: "log";
  attachmentName?: string;
  log: CypressLogEntry;
};

export type ApiStepDescriptor = StepDescriptorBase & {
  type: "api";
};

export type StepDescriptor = LogStepDescriptor | ApiStepDescriptor;

export type StepFinalizer = (message: CypressStepFinalizeMessage["data"]) => void;

export type TmsSpecState = {
  config: {
    stepsFromCommands: {
      maxArgumentLength: number;
      maxArgumentDepth: number;
    };
  };
  initialized: boolean;
  testPlan: TestPlanV1 | null | undefined;
  projectDir?: string;
  messages: CypressMessage[];
  currentTest?: CypressTest;
  stepStack: StepDescriptor[];
  stepsToFinalize: [step: StepDescriptor, finalizer: StepFinalizer | undefined][];
  nextApiStepId: number;
};

export type TmsCypressTaskArgs = {
  absolutePath: string;
  messages: readonly CypressMessage[];
  isInteractive: boolean;
};

export type CypressSuiteFunction = (
  title: string,
  configOrFn?: Cypress.SuiteConfigOverrides | ((this: Mocha.Suite) => void),
  fn?: (this: Mocha.Suite) => void,
) => Mocha.Suite;

export type DirectHookImplementation = Mocha.AsyncFunc | ((this: Mocha.Context) => void);
export type HookImplementation = Mocha.Func | DirectHookImplementation;
