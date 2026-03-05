/**
 * Helpers that use Node.js built-in modules. Import only in Node context (e.g. reporter, plugins).
 * Do not import in browser bundle (Cypress support/specs).
 */

import * as fs from "node:fs";
import * as path from "node:path";
import process from "node:process";

let cachedProjectRoot: string | null = null;

function findProjectRoot(): string {
  let dir = process.cwd();
  while (dir !== path.dirname(dir)) {
    try {
      fs.accessSync(path.join(dir, "package.json"), fs.constants.F_OK);
      return dir;
    } catch {
      dir = path.dirname(dir);
    }
  }
  return process.cwd();
}

export function getProjectRoot(): string {
  if (!cachedProjectRoot) cachedProjectRoot = findProjectRoot();
  return cachedProjectRoot;
}

export function getRelativePath(absolutePath: string): string {
  const root = getProjectRoot();
  if (path.isAbsolute(absolutePath)) {
    return path.relative(root, absolutePath);
  }
  return absolutePath;
}

export function getPosixPath(filepath: string): string {
  return process.platform === "win32" ? filepath.replaceAll("\\", "/") : filepath;
}

export interface TestPlanV1 {
  version: "1.0";
  tests: Array<{ id?: string | number; selector?: string }>;
}

export function parseTestPlan(): TestPlanV1 | undefined {
  const envPath = process.env.TMS_TESTPLAN_PATH;
  if (!envPath) return undefined;
  try {
    const content = fs.readFileSync(envPath, "utf-8");
    const plan = JSON.parse(content) as TestPlanV1;
    if (!plan.tests?.length) return undefined;
    return plan;
  } catch {
    return undefined;
  }
}
