import { Status } from "testit-js-commons";
import type {
  CypressConsoleProps,
  CypressHook,
  CypressLogEntry,
  CypressRenderProps,
  CypressStepStopMessage,
  CypressSuite,
  CypressTest,
  StepDescriptor,
  StatusDetails,
} from "../models/types.js";
import { TMS_REPORT_SYSTEM_HOOK } from "./events/mocha.js";
import { getTmsState, getProjectDir } from "./state.js";
import { resolveStepStatus } from "./steps.js";
import { noopRuntime, TestRuntime } from "./types.js";

const IS_WIN = Cypress.platform === "win32";

export const getFileNameFromPath = (path: string) => path.substring(path.lastIndexOf(IS_WIN ? "\\" : "/") + 1);

export const resolveSpecRelativePath = (spec: Cypress.Spec) => {
  const projectDir = getProjectDir();
  const specPath = projectDir ? spec.absolute.substring(projectDir.length + 1) : spec.relative;
  return IS_WIN ? specPath.replaceAll("\\", "/") : specPath;
};

export const uint8ArrayToBase64 = (data: unknown) => {
  // @ts-ignore
  const u8arrayLike = Array.isArray(data) || data.buffer;

  if (!u8arrayLike) {
    return data as string;
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  return btoa(String.fromCharCode.apply(null, data as number[]));
};

export const getTestStartData = (test: CypressTest) => ({
  ...getTestMetadata(test),
  start:
    typeof test.wallClockStartedAt === "string"
      ? Date.parse(test.wallClockStartedAt)
      : test.wallClockStartedAt?.getTime?.() || Date.now(),
});

export const getTestStopData = (test: CypressTest) => ({
  duration: test.duration ?? 0,
  retries: (test as any)._retries ?? 0,
});

export const getTestSkipData = () => ({
  statusDetails: { message: "This is a pending test" },
});

export const getStepStopData = (step: StepDescriptor, status?: Status, statusDetails?: StatusDetails) => {
  const data: CypressStepStopMessage["data"] = {
    id: step.id,
    stop: Date.now(),
    status: status ?? resolveStepStatus(step),
  };
  if (statusDetails) {
    data.statusDetails = statusDetails;
  }
  return data;
};

const testReportedKey = Symbol("The test has been reported to Tms");

export const markTestAsReported = (test: CypressTest) => {
  (test as any)[testReportedKey] = true;
};

export const isTestReported = (test: CypressTest) => (test as any)[testReportedKey] === true;

export const iterateSuites = function* (parent: CypressSuite) {
  const suiteStack: CypressSuite[] = [];
  for (let s: CypressSuite | undefined = parent; s; s = suiteStack.pop()) {
    yield s;

    // Pushing in reverse allows us to maintain depth-first pre-order traversal;
    // the same order is used by Mocha & Cypress.
    for (let i = s.suites.length - 1; i >= 0; i--) {
      suiteStack.push(s.suites[i]);
    }
  }
};

export const iterateTests = function* (parent: CypressSuite) {
  for (const suite of iterateSuites(parent)) {
    yield* suite.tests;
  }
};

export const getSuitePath = (test: CypressTest) => {
  const suites: CypressSuite[] = [];
  for (let s: CypressSuite | undefined = test.parent; s; s = s.parent) {
    suites.push(s);
  }
  suites.reverse();
  return suites;
};

export const getSuiteTitlePath = (test: CypressTest): string[] =>
  getSuitePath(test)
    .filter((s) => s.title)
    .map((s) => s.title);

export const generateApiStepId = () => (getTmsState().nextApiStepId++).toString();

export const getTestMetadata = (test: CypressTest) => {
  const suites = test.titlePath().slice(0, -1);
  const fullNameSuffix = `${[...suites, test.title].join(" ")}`;
  return { name: test.title, fullNameSuffix };
};

export const isTmsHook = (hook: CypressHook) => hook.title.includes(TMS_REPORT_SYSTEM_HOOK);

export const isRootAfterAllHook = (hook: CypressHook) => hook.parent!.root && hook.hookName === "after all";

export const isLastRootAfterHook = (context: Mocha.Context) => {
  const currentAfterAll = context.test as CypressHook;
  const rootSuite = (context.test as CypressHook).parent!;
  const hooks = (rootSuite as any).hooks as CypressHook[];
  const lastAfterAll = hooks.findLast((h) => h.hookName === "after all");
  return lastAfterAll?.hookId === currentAfterAll.hookId;
};

export const getStatusDataOfTestSkippedByHookError = (
  hookTitle: string,
  isEachHook: boolean,
  err: Error,
  suite: CypressSuite,
) => {
  const status = isEachHook ? Status.SKIPPED : Status.FAILED;
  const { message, trace } = getMessageAndTraceFromError(err);
  return {
    status,
    statusDetails: {
      message: isEachHook ? getSkipReason(hookTitle, suite) : message,
      trace,
    },
  };
};

const getSkipReason = (hookTitle: string, suite: CypressSuite) => {
  const suiteName = suite.title ? `'${suite.title}'` : "root";
  return `'${hookTitle}' defined in the ${suiteName} suite has failed`;
};

export const resolveConsoleProps = (entry: CypressLogEntry): CypressConsoleProps => {
  // consoleProps can be a function or an object(cy.origin just return an object)
  return typeof entry.attributes.consoleProps === "function"
    ? entry.attributes.consoleProps()
    : entry.attributes.consoleProps;
};

export const resolveRenderProps = (entry: CypressLogEntry): CypressRenderProps => {
  // renderProps can be a function or an object(cy.origin just return an object)
  return typeof entry?.attributes?.renderProps === "function"
    ? entry.attributes.renderProps()
    : entry.attributes?.renderProps;
};

export const getMessageAndTraceFromError = (
  error: Error | { message?: string; stack?: string },
): StatusDetails => {
  const message = error.message ?? undefined;
  const trace = error.stack ?? undefined;
  const v = error as Record<string, unknown>;
  const actual = v.actual !== undefined ? serialize(v.actual) : undefined;
  const expected = v.expected !== undefined ? serialize(v.expected) : undefined;
  return { message, trace, actual, expected };
};

export const isPromise = (obj: unknown): obj is PromiseLike<unknown> =>
  !!obj &&
  (typeof obj === "object" || typeof obj === "function") &&
  "then" in (obj as object) &&
  typeof (obj as PromiseLike<unknown>).then === "function";

export type SerializeOptions = { maxDepth?: number; maxLength?: number; replacer?: (key: string, value: unknown) => unknown };

export const serialize = (value: unknown, opts: SerializeOptions = {}): string => {
  const { maxLength = 0 } = opts;
  let stringValue: string;
  if (typeof value === "object" && value !== null) {
    try {
      stringValue = JSON.stringify(value);
    } catch {
      stringValue = String(value);
    }
  } else {
    stringValue = String(value);
  }
  if (maxLength && stringValue.length > maxLength) {
    return stringValue.slice(0, maxLength) + "...";
  }
  return stringValue;
};

const KEY = "tmsTestRuntime";

export const setGlobalTestRuntime = (r: TestRuntime): void => {
  (globalThis as Record<string, unknown>)[KEY] = () => r;
};

export const getGlobalTestRuntime = (): TestRuntime => {
  const fn = (globalThis as Record<string, unknown>)[KEY] as (() => TestRuntime | undefined) | undefined;
  return fn?.() ?? noopRuntime;
};
