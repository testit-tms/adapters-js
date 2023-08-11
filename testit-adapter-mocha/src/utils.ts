import { Step } from "testit-js-commons";
import { Suite } from "mocha";
import { Hook } from "./types";

export function hookToStep(hook: Hook): Step {
  return {
    title: hook.title,
    duration: hook.duration ?? 0,
  };
}

export function extractHooks(suite?: Suite): {
  afterAll: Step[];
  beforeAll: Step[];
  afterEach: Step[];
  beforeEach: Step[];
} {
  if (!suite) return { afterAll: [], beforeAll: [], afterEach: [], beforeEach: [] };

  const hooks = extractHooks(suite.parent);

  // @ts-ignore
  const { _afterAll = [], _beforeAll = [], _afterEach = [], _beforeEach = [] } = suite;

  return {
    beforeAll: [...hooks.beforeAll, ..._beforeAll.map(hookToStep)],
    afterAll: [...hooks.afterAll, ..._afterAll.map(hookToStep)],
    afterEach: [...hooks.afterEach, ..._afterEach.map(hookToStep)],
    beforeEach: [...hooks.beforeEach, ..._beforeEach.map(hookToStep)],
  };
}
