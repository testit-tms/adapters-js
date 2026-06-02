import {
  findGherkinDocument,
  formatPickleStepTitle,
  mapPickleToAutotestPost,
} from "./mappers";
import { gherkinFeature, pickleForScenario } from "./test-fixtures";

describe("cucumber mappers", () => {
  const annotationDoc = gherkinFeature({
    uri: "features/AnnotationTests.feature",
    featureName: "AnnotationTests",
    scenarioId: "sc-ann",
    scenarioName: "Without annotation success",
    stepId: "step-ann",
    stepKeyword: "Then ",
    stepText: "return true",
  });

  const methodsDoc = gherkinFeature({
    uri: "features/MethodsTests.feature",
    featureName: "MethodsTests",
    scenarioId: "sc-methods",
    scenarioName: "Some method test",
    stepId: "step-methods",
    stepKeyword: "When ",
    stepText: "call method",
  });

  const documents = [annotationDoc, methodsDoc];

  it("findGherkinDocument matches pickle.uri, not array order", () => {
    const pickle = pickleForScenario({
      id: "p-methods",
      uri: "features/MethodsTests.feature",
      name: "Some method test",
      scenarioId: "sc-methods",
      stepId: "step-methods",
      stepText: "call method",
    });

    expect(findGherkinDocument(documents, pickle)?.feature?.name).toBe("MethodsTests");
  });

  it("mapPickleToAutotestPost uses classname from own feature file", () => {
    const pickle = pickleForScenario({
      id: "p-methods",
      uri: "features/MethodsTests.feature",
      name: "Some method test",
      scenarioId: "sc-methods",
      stepId: "step-methods",
      stepText: "call method",
    });

    const autotest = mapPickleToAutotestPost(documents, pickle, "ext-methods", (s) => s.text);

    expect(autotest.classname).toBe("MethodsTests");
    expect(autotest.classname).not.toBe("AnnotationTests");
  });

  it("mapPickleToAutotestPost uses @ClassName tag when present", () => {
    const pickle = pickleForScenario({
      id: "p-tagged",
      uri: "features/AnnotationTests.feature",
      name: "Tagged scenario",
      scenarioId: "sc-ann",
      stepId: "step-ann",
      stepText: "return true",
      tagNames: ["@ClassName=CustomClass"],
    });

    const autotest = mapPickleToAutotestPost(documents, pickle, "ext-tagged", (s) => s.text);

    expect(autotest.classname).toBe("CustomClass");
  });

  it("formatPickleStepTitle restores Gherkin keyword", () => {
    const pickle = pickleForScenario({
      id: "p-ann",
      uri: "features/AnnotationTests.feature",
      name: "Without annotation success",
      scenarioId: "sc-ann",
      stepId: "step-ann",
      stepText: "return true",
    });

    expect(formatPickleStepTitle(documents, pickle.steps[0])).toBe("Then  return true");
  });
});
