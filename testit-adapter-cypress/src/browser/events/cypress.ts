import type { CypressLogEntry } from "../../models/types.js";
import {
  setupScreenshotAttachmentStep,
  shouldCreateStepFromCommandLogEntry,
  startCommandLogStep,
} from "../commandLog.js";
import { reportScreenshot } from "../lifecycle.js";
import { reportStepError } from "../steps.js";
import { getFileNameFromPath } from "../utils.js";

export const registerCypressEventListeners = () => Cypress.on("fail", onFail).on("log:added", onLogAdded);

export const enableReportingOfCypressScreenshots = () => Cypress.Screenshot.defaults({ onAfterScreenshot });

const onAfterScreenshot = (
  ...[, { name: originalName, path }]: Parameters<Cypress.ScreenshotDefaultsOptions["onAfterScreenshot"]>
) => {
  const name = originalName ?? getFileNameFromPath(path);

  reportScreenshot(path, name);
  setupScreenshotAttachmentStep(originalName, name);
};

const onLogAdded = (_: Cypress.ObjectLike, entry: CypressLogEntry) => {
  if (shouldCreateStepFromCommandLogEntry(entry)) {
    startCommandLogStep(entry);
  }
};

const onFail = (error: Cypress.CypressError) => {
  reportStepError(error);

  if (noSubsequentFailListeners()) {
    throw error;
  }
};

/**
 * Returns true if this handler is the last registered "fail" listener in Cypress.
 *
 * In that case we rethrow the error so that Cypress can apply its default error handling.
 * If there are other listeners after ours, we assume they will handle the error.
 */
const noSubsequentFailListeners = () => {
  const failListeners = Cypress.listeners("fail");
  const lastFailListener = failListeners.at(-1);

  return Object.is(lastFailListener, onFail);
};
