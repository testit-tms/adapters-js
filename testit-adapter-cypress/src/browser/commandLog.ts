import type { CypressLogEntry, LogStepDescriptor, Parameter } from "../models/types.js";
import { isDefined } from "../utils.js";
import { reportStepStart } from "./lifecycle.js";
import serializePropValue from "./serialize.js";
import { getCurrentStep, getStepStack, pushStep, setupStepFinalization } from "./state.js";
import { TMS_STEP_CMD_SUBJECT, findAndStopStepWithSubsteps, isLogStep } from "./steps.js";
import { resolveConsoleProps, resolveRenderProps } from "./utils.js";

export const shouldCreateStepFromCommandLogEntry = (entry: CypressLogEntry) => {
  const { event, instrument } = entry.attributes;
  if (instrument !== "command") {
    // We are interested in the "TEST BODY" panel only for now.
    // Other instruments are logged in separate panels.
    return false;
  }

  if (event) {
    // Events are tricky to report as they may span across commands and even leave the test's scope.
    // We ignore them for now.
    return false;
  }

  if (isApiStepErrorLogEntry(entry)) {
    // Cypress don't create a log message for 'cy.then' except when it throws an error.
    // This is in particularly happens when the function passed to 'testit.step' throws. In such a case however,
    // creating an extra step from the log entry is redundant because the error is already included in the report as
    // a part of the step.
    return false;
  }

  return true;
};

/**
 * Checks if the current step represents a cy.screenshot command log entry. If this is the case, associates the name
 * of the screenshot with the step. Later, that will allow converting the step with the attachment into the attachment
 * step.
 */
export const setupScreenshotAttachmentStep = (originalName: string | undefined, name: string) => {
  const step = getCurrentStep();
  if (step && isLogStep(step)) {
    const {
      name: commandName,
      props: { name: nameFromProps },
    } = resolveConsoleProps(step.log);
    if (commandName === "screenshot" && nameFromProps === originalName) {
      step.attachmentName = name;
    }
  }
};

export const startCommandLogStep = (entry: CypressLogEntry) => {
  const currentLogEntry = getCurrentLogEntry();

  if (typeof currentLogEntry !== "undefined" && shouldStopCurrentLogStep(currentLogEntry.log, entry)) {
    stopCommandLogStep(currentLogEntry.log.attributes.id);
  }

  pushLogEntry(entry);
  reportStepStart(entry.attributes.id, getCommandLogStepName(entry));
  scheduleCommandLogStepStop(entry);
};

export const stopCommandLogStep = (entryId: string) => findAndStopStepWithSubsteps(({ id }) => id === entryId);

const pushLogEntry = (entry: CypressLogEntry) => {
  const id = entry.attributes.id;
  const stepDescriptor: LogStepDescriptor = { id, type: "log", log: entry };

  pushStep(stepDescriptor);

  // Some properties of some Command Log entries are undefined at the time the entry is stopped. An example is the
  // Yielded property of some queries. We defer converting them to Tms step parameters until the test/hook ends.
  setupStepFinalization(stepDescriptor, (data) => {
    data.parameters = getCommandLogStepParameters(entry);

    if (stepDescriptor.attachmentName) {
      // Rename the step to match the attachment name. Once the names are the same, Tms will render the
      // attachment in the place of the step.
      data.name = stepDescriptor.attachmentName;
    }
  });
};

/**
 * Wraps `entry.endGroup` so that the Tms step created for a Command Log group
 * is always stopped when Cypress finishes that group.
 *
* Behavior:
* - Retains the original `entry.endGroup` handler.
 * - Replaces it with a wrapper function that:
* - first calls `stopCommandLogStep(id)`, completing the step in our state;
 * - then calls the original `entry.endGroup` with the same `this` so as not to break Cypress.
 */
const overrideEntryEndGroup = (entry: CypressLogEntry, id: string) => {
  const originalEndGroup = entry.endGroup;
  entry.endGroup = function () {
    stopCommandLogStep(id);
    return originalEndGroup.call(this);
  };
};

/**
* Wraps `entry.end` for single Command Log entries to synchronize
 * the lifecycle of a step in Tms with the completion of a log entry in Cypress.
 *
* Behavior:
* - Saves the original `entry.end` (without context binding).
* - Sets a new `entry.end`, which:
* - first calls `stopCommandLogStep(id)` to stop the step;
 * - then calls the original `end` with the correct `this', while maintaining the standard behavior of Cypress.
 */
const overrideEntryEnd = (entry: CypressLogEntry, id: string) => {
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const originalEnd = entry.end;
  entry.end = function () {
    stopCommandLogStep(id);
    return originalEnd.call(this);
  };
};

const scheduleCommandLogStepStop = (entry: CypressLogEntry) => {
  const { groupStart, end, id } = entry.attributes;
  if (end) {
    // Some entries are already completed (this is similar to the idea behind tms.logStep).
    // Cypress won't call entry.end() in such a case, so we need to stop such a step now.
    // Example: cy.log
    stopCommandLogStep(id);
  } else if (groupStart) {
    // A logging group must be stopped be the user via the Cypress.Log.endGroup() call.
    // If the call is missing, the corresponding step will be stopped either at the test's (the hook's) end.
    overrideEntryEndGroup(entry, id);
  } else {
    // Regular log entries are finalized by Cypress via the Cypress.Log.end() call. We're hooking into this function
    // to complete the step at the same time.
    overrideEntryEnd(entry, id);
  }
};

const isApiStepErrorLogEntry = (entry: CypressLogEntry) => {
  const { name } = entry.attributes;
  return name === "then" && Object.is(resolveConsoleProps(entry).props["Applied To"], TMS_STEP_CMD_SUBJECT);
};

const getCommandLogStepName = (entry: CypressLogEntry) => {
  const { name, message, displayName } = entry.attributes;
  const resolvedName = (displayName ?? name).trim();
  const resolvedMessage = (
    maybeGetAssertionLogMessage(entry) ??
    maybeGetCucumberLogMessage(entry) ??
    resolveRenderProps(entry).message ??
    message
  ).trim();
  const stepName = [resolvedName, resolvedMessage].filter(Boolean).join(" ");
  return stepName;
};

const getCommandLogStepParameters = (entry: CypressLogEntry) =>
  getLogProps(entry)
    .map(([k, v]) => ({
      name: k.toString(),
      value: serializePropValue(v),
    }))
    .filter(getPropValueSetFilter(entry));

const WELL_KNOWN_CUCUMBER_LOG_NAMES = ["Given", "When", "Then", "And"];

const maybeGetCucumberLogMessage = (entry: CypressLogEntry) => {
  const {
    attributes: { name, message },
  } = entry;
  if (WELL_KNOWN_CUCUMBER_LOG_NAMES.includes(name.trim()) && message.startsWith("**") && message.endsWith("**")) {
    return message.substring(2, message.length - 2);
  }
};

const getLogProps = (entry: CypressLogEntry) => {
  const isAssertionWithMessage = !!maybeGetAssertionLogMessage(entry);
  const { props, name } = resolveConsoleProps(entry);

  // accessing LocalStorage after the page reload can stick the test runner
  // to avoid the issue, we just need to log the command manually
  // the problem potentially can happen with other storage related commands, like `clearAllLocalStorage`, `clearAllSessionStorage`, `getAllLocalStorage`, `getAllSessionStorage`, `setLocalStorage`, `setSessionStorage`
  // but probably, we don't need to silent them all at this moment
  if (["clearLocalStorage"].includes(name)) {
    return [] as [string, unknown][];
  }

  // For assertion logs, we interpolate the 'Message' property, which contains unformatted assertion description,
  // directly into the step's name.
  // No need to keep the exact same information in the step's parameters.
  const entries = Object.entries(props);
  return entries.filter(([key, value]) =>
    isLogPropIncludedInParameters({ key, value, isAssertionWithMessage }),
  );
};

const isLogPropIncludedInParameters = ({
  key,
  value,
  isAssertionWithMessage,
}: {
  key: string | number | symbol;
  value: unknown;
  isAssertionWithMessage: boolean;
}) => {
  if (!isDefined(value)) {
    return false;
  }

  if (isAssertionWithMessage && key === "Message") {
    // The same text is already included into the step's name.
    // No need to duplicate it in parameters.
    return false;
  }

  return true;
};

const maybeGetAssertionLogMessage = (entry: CypressLogEntry) => {
  if (isAssertLog(entry)) {
    const message = resolveConsoleProps(entry).props.Message;

    if (message && typeof message === "string") {
      return message;
    }
  }
};

const isAssertLog = ({ attributes: { name } }: CypressLogEntry) => name === "assert";

const getCurrentLogEntry = () => getStepStack().findLast(isLogStep);

const shouldStopCurrentLogStep = (currentLogEntry: CypressLogEntry, newLogEntry: CypressLogEntry) => {
  const { groupStart: currentEntryIsGroup, type: currentEntryType } = currentLogEntry.attributes;
  const { type: newEntryType } = newLogEntry.attributes;

  return !currentEntryIsGroup && (currentEntryType === "child" || newEntryType !== "child");
};

/**
 * Returns a predicate that decides whether a step parameter should be included.
 * For "wrap" commands we include all parameters; for others we drop "Yielded" when it's "{}".
 */
const getPropValueSetFilter = (entry: CypressLogEntry) => {
  const isWrapCommand = entry.attributes.name === "wrap";

  if (isWrapCommand) {
    return () => true;
  }

  return ({ name, value }: Parameter) => shouldIncludeParameter(name, value);
};

const shouldIncludeParameter = (name: string, value: string) => {
  return name !== "Yielded" || value !== "{}";
};
