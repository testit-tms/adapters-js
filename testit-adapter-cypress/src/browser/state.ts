import type { TmsSpecState, CypressMessage, CypressTest, StepDescriptor, StepFinalizer } from "../models/types.js";
import { DEFAULT_RUNTIME_CONFIG, last, toReversed } from "../utils.js";

export const getTmsState = () => {
  let state = Cypress.env("tms") as TmsSpecState;

  if (!state) {
    state = {
      config: DEFAULT_RUNTIME_CONFIG,
      initialized: false,
      messages: [],
      testPlan: undefined,
      currentTest: undefined,
      projectDir: undefined,
      stepStack: [],
      stepsToFinalize: [],
      nextApiStepId: 0,
    };

    Cypress.env("tms", state);
  }

  return state;
};

export const isTmsInitialized = () => getTmsState().initialized;

export const setTmsInitialized = () => {
  getTmsState().initialized = true;
};

export const getRuntimeMessages = () => getTmsState().messages;

export const setRuntimeMessages = (value: CypressMessage[]) => {
  getTmsState().messages = value;
};

export const enqueueRuntimeMessage = (message: CypressMessage) => {
  getRuntimeMessages().push(message);
};

export const getTmsTestPlan = () => getTmsState().testPlan;

export const getProjectDir = () => getTmsState().projectDir;

export const getCurrentTest = () => getTmsState().currentTest;

export const setCurrentTest = (test: CypressTest) => {
  getTmsState().currentTest = test;
};

export const dropCurrentTest = () => {
  getTmsState().currentTest = undefined;
};

export const getConfig = () => getTmsState().config;

export const getStepStack = () => getTmsState().stepStack;

export const getCurrentStep = () => last(getStepStack());

export const pushStep = (step: StepDescriptor) => getStepStack().push(step);

export const popStep = () => getStepStack().pop();

export const popSteps = (index: number) => toReversed(getStepStack().splice(index));

export const popAllSteps = () => popSteps(0);

export const clearStepStack = () => {
  getTmsState().stepStack = [];
};

export const setupStepFinalization = <T extends StepDescriptor>(step: T, finalizer?: StepFinalizer) =>
  getTmsState().stepsToFinalize.push([step, finalizer]);

export const getStepsToFinalize = () => getTmsState().stepsToFinalize;

export const clearStepsToFinalize = () => {
  const state = getTmsState();
  state.stepsToFinalize = [];
};
