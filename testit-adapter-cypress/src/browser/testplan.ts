import type { CypressSuite, CypressTest } from "../models/types.js";
import { getTestMetadata, resolveSpecRelativePath } from "./utils.js";
import { Utils } from "testit-js-commons";

export const applyTestPlan = (spec: Cypress.Spec, root: CypressSuite) => {
  const testsInRun = (Cypress.env("tmsTestsInRun") as string[] | undefined) ?? undefined;
  if (!testsInRun || !testsInRun.length) return;

  const specPath = resolveSpecRelativePath(spec);

  let testsBefore = 0;
  for (const suite of iterateSuites(root)) {
    testsBefore += suite.tests.length;
  }

  for (const suite of iterateSuites(root)) {
    const indicesToRemove = getIndicesOfDeselectedTests(testsInRun, specPath, suite.tests);
    removeSortedIndices(suite.tests, indicesToRemove);
  }

  let testsAfter = 0;
  for (const suite of iterateSuites(root)) {
    testsAfter += suite.tests.length;
  }

  if (testsBefore > 0 && testsAfter === 0) {
    throw new Error("[testit-adapter-cypress] No Cypress tests matched externalIds from tests in run. ");
  }
};

const iterateSuites = function* (parent: CypressSuite) {
  const suiteStack: CypressSuite[] = [];
  for (let s: CypressSuite | undefined = parent; s; s = suiteStack.pop()) {
    yield s;

    // Pushing in reverse allows us to maintain depth-first pre-order traversal -
    // the same order as used by Mocha & Cypress.
    for (let i = s.suites.length - 1; i >= 0; i--) {
      suiteStack.push(s.suites[i]);
    }
  }
};

const getIndicesOfDeselectedTests = (
  testsInRun: readonly string[],
  specPath: string,
  tests: readonly CypressTest[],
) => {
  const indicesToRemove: number[] = [];
  tests.forEach((test, index) => {
    const { fullNameSuffix } = getTestMetadata(test);
    const fullName = `${specPath}#${fullNameSuffix}`;
    const externalId = Utils.getHash(fullName);

    if (!testsInRun.includes(externalId)) {
      indicesToRemove.push(index);
    }
  });
  return indicesToRemove;
};

const removeSortedIndices = <T>(arr: T[], indices: readonly number[]) => {
  for (let i = indices.length - 1; i >= 0; i--) {
    arr.splice(indices[i], 1);
  }
};

