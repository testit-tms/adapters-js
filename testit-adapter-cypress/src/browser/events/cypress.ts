import type { CypressLogEntry } from "../../types.js";
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

const noSubsequentFailListeners = () => Object.is(Cypress.listeners("fail").at(-1), onFail);
