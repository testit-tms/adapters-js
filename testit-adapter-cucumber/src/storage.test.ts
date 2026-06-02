import { Storage } from "./storage";
import {
  gherkinFeature,
  pickleForScenario,
  startedAndFinished,
  stepStartedAndFinished,
  testCaseForPickle,
} from "./test-fixtures";

describe("cucumber Storage", () => {
  it("getAutotests assigns classname per feature uri when multiple features in run", () => {
    const storage = new Storage();

    storage.saveGherkinDocument(
      gherkinFeature({
        uri: "features/AnnotationTests.feature",
        featureName: "AnnotationTests",
        scenarioId: "sc-1",
        scenarioName: "Scenario A",
        stepId: "st-1",
        stepKeyword: "Then ",
        stepText: "ok",
      }),
    );
    storage.saveGherkinDocument(
      gherkinFeature({
        uri: "features/MethodsTests.feature",
        featureName: "MethodsTests",
        scenarioId: "sc-2",
        scenarioName: "Scenario B",
        stepId: "st-2",
        stepKeyword: "When ",
        stepText: "run",
      }),
    );

    const pickleA = pickleForScenario({
      id: "p-1",
      uri: "features/AnnotationTests.feature",
      name: "Scenario A",
      scenarioId: "sc-1",
      stepId: "st-1",
      stepText: "ok",
    });
    const pickleB = pickleForScenario({
      id: "p-2",
      uri: "features/MethodsTests.feature",
      name: "Scenario B",
      scenarioId: "sc-2",
      stepId: "st-2",
      stepText: "run",
    });

    storage.savePickle(pickleA);
    storage.savePickle(pickleB);

    const autotests = storage.getAutotests();
    const byExternal = new Map(autotests.map((a) => [a.externalId, a]));

    expect(byExternal.get(storage.resolvePickleExternalId(pickleA))?.classname).toBe("AnnotationTests");
    expect(byExternal.get(storage.resolvePickleExternalId(pickleB))?.classname).toBe("MethodsTests");
  });

  it("resolvePickleExternalId disambiguates Scenario Outline rows with same @ExternalId", () => {
    const storage = new Storage();
    const sharedTag = ["@ExternalId=parametrized_test"];

    const row1 = pickleForScenario({
      id: "p-row-1",
      uri: "features/outline.feature",
      name: "Outline -- #1",
      scenarioId: "sc-o",
      stepId: "st-o",
      stepText: "step",
      tagNames: sharedTag,
    });
    const row2 = pickleForScenario({
      id: "p-row-2",
      uri: "features/outline.feature",
      name: "Outline -- #2",
      scenarioId: "sc-o",
      stepId: "st-o",
      stepText: "step",
      tagNames: sharedTag,
    });

    storage.savePickle(row1);
    storage.savePickle(row2);

    const id1 = storage.resolvePickleExternalId(row1);
    const id2 = storage.resolvePickleExternalId(row2);

    expect(id1).toContain("parametrized");
    expect(id2).toContain("parametrized");
    expect(id1).toContain("__");
    expect(id2).toContain("__");
    expect(id1).not.toBe(id2);
  });

  it("getRealtimePayload returns one result per testCaseStarted with keyword in step title", () => {
    const storage = new Storage();
    const doc = gherkinFeature({
      uri: "features/AnnotationTests.feature",
      featureName: "AnnotationTests",
      scenarioId: "sc-1",
      scenarioName: "Without annotation success",
      stepId: "st-1",
      stepKeyword: "Then ",
      stepText: "return true",
    });
    storage.saveGherkinDocument(doc);

    const pickle = pickleForScenario({
      id: "p-1",
      uri: "features/AnnotationTests.feature",
      name: "Without annotation success",
      scenarioId: "sc-1",
      stepId: "st-1",
      stepText: "return true",
    });
    storage.savePickle(pickle);

    const testCase = testCaseForPickle(pickle);
    storage.saveTestCase(testCase);

    const { started, finished } = startedAndFinished(testCase.id);
    storage.saveTestCaseStarted(started);
    storage.saveTestCaseFinished(finished);

    const { started: stepStarted, finished: stepFinished } = stepStartedAndFinished("test-step-1");
    storage.saveTestStepStarted(stepStarted);
    storage.saveTestStepFinished(stepFinished);

    expect(storage.getRealtimePayload("missing")).toBeUndefined();

    const payload = storage.getRealtimePayload(started.id);
    expect(payload).toBeDefined();
    expect(payload?.autotest.classname).toBe("AnnotationTests");
    expect(payload?.result.stepResults?.[0]?.title).toBe("Then  return true");
    expect(payload?.result.autoTestExternalId).toBe(payload?.autotest.externalId);
  });

  it("listCatchUpRealtimePayloads skips already sent testCaseStarted ids", () => {
    const storage = new Storage();
    const doc = gherkinFeature({
      uri: "features/MethodsTests.feature",
      featureName: "MethodsTests",
      scenarioId: "sc-2",
      scenarioName: "Scenario B",
      stepId: "st-2",
      stepKeyword: "When ",
      stepText: "run",
    });
    storage.saveGherkinDocument(doc);

    const pickle = pickleForScenario({
      id: "p-2",
      uri: "features/MethodsTests.feature",
      name: "Scenario B",
      scenarioId: "sc-2",
      stepId: "st-2",
      stepText: "run",
    });
    storage.savePickle(pickle);
    const testCase = testCaseForPickle(pickle);
    storage.saveTestCase(testCase);
    const { started, finished } = startedAndFinished(testCase.id);
    storage.saveTestCaseStarted(started);
    storage.saveTestCaseFinished(finished);
    const { started: stepStarted, finished: stepFinished } = stepStartedAndFinished("test-step-1");
    storage.saveTestStepStarted(stepStarted);
    storage.saveTestStepFinished(stepFinished);

    const sent = new Set<string>([started.id]);
    expect(storage.listCatchUpRealtimePayloads(sent)).toHaveLength(0);
    expect(storage.listCatchUpRealtimePayloads(new Set())).toHaveLength(1);
  });
});
