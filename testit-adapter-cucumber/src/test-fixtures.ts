import {
  GherkinDocument,
  Pickle,
  PickleStep,
  TestCase,
  TestCaseFinished,
  TestCaseStarted,
  TestStepFinished,
  TestStepResultStatus,
  TestStepStarted,
} from "@cucumber/messages";

const loc = { line: 1, column: 1 };
const ts = (seconds: number) => ({ seconds, nanos: 0 });
const dur = (seconds: number) => ({ seconds, nanos: 0 });

function tag(name: string) {
  return { id: `tag-${name}`, name, location: loc };
}

function pickleTag(name: string) {
  return { name, astNodeId: `ast-${name}` };
}

export function gherkinFeature(params: {
  uri: string;
  featureName: string;
  scenarioId: string;
  scenarioName: string;
  stepId: string;
  stepKeyword: string;
  stepText: string;
  scenarioTags?: string[];
}): GherkinDocument {
  return {
    uri: params.uri,
    feature: {
      name: params.featureName,
      description: "",
      keyword: "Feature",
      language: "en",
      location: loc,
      tags: [],
      children: [
        {
          scenario: {
            id: params.scenarioId,
            name: params.scenarioName,
            description: "",
            keyword: "Scenario",
            tags: (params.scenarioTags ?? []).map(tag),
            location: loc,
            steps: [
              {
                id: params.stepId,
                keyword: params.stepKeyword,
                text: params.stepText,
                location: loc,
              },
            ],
            examples: [],
          },
        },
      ],
    },
  } as unknown as GherkinDocument;
}

export function pickleForScenario(params: {
  id: string;
  uri: string;
  name: string;
  scenarioId: string;
  stepId: string;
  stepText: string;
  tagNames?: string[];
}): Pickle {
  const pickleStep = {
    id: `${params.id}-step`,
    text: params.stepText,
    astNodeIds: [params.stepId],
  } as PickleStep;

  return {
    id: params.id,
    uri: params.uri,
    name: params.name,
    language: "en",
    astNodeIds: [params.scenarioId],
    tags: (params.tagNames ?? []).map(pickleTag),
    steps: [pickleStep],
  };
}

export function testCaseForPickle(pickle: Pickle, testCaseId = "tc-1"): TestCase {
  return {
    id: testCaseId,
    pickleId: pickle.id,
    testSteps: [
      {
        id: "test-step-1",
        pickleStepId: pickle.steps[0].id,
        stepDefinitionIds: [],
        stepMatchArgumentsLists: [],
      },
    ],
  };
}

export function startedAndFinished(
  testCaseId: string,
  testCaseStartedId = "tcs-1",
): { started: TestCaseStarted; finished: TestCaseFinished } {
  return {
    started: {
      id: testCaseStartedId,
      testCaseId,
      attempt: 0,
      timestamp: ts(100),
    },
    finished: {
      testCaseStartedId,
      timestamp: ts(101),
      willBeRetried: false,
    },
  };
}

export function stepStartedAndFinished(testStepId: string): {
  started: TestStepStarted;
  finished: TestStepFinished;
} {
  return {
    started: {
      testStepId,
      testCaseStartedId: "tcs-1",
      timestamp: ts(100),
    },
    finished: {
      testStepId,
      testCaseStartedId: "tcs-1",
      timestamp: ts(101),
      testStepResult: {
        duration: dur(1),
        status: TestStepResultStatus.PASSED,
      },
    },
  };
}
