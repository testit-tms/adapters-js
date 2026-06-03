import {
  Background,
  DataTable,
  Examples,
  GherkinDocument,
  Pickle,
  PickleStep,
  Rule,
  Scenario,
  Step as CucumberStep,
} from "@cucumber/messages";
import { parseTags } from "./utils";
import { AutotestPost, ShortStep, Utils } from "testit-js-commons";

function normalizeUri(uri: string): string {
  return uri.replace(/\\/g, "/");
}

export function mapDate(date: number): Date {
  return new Date(date * 1000);
}

export function mapDocument(document: GherkinDocument): AutotestPost[] {
  if (document.feature === undefined) {
    return [];
  }

  const setup = document.feature.children
    .map((child) => child.background)
    .filter((background): background is Background => background !== undefined)
    .map((background) => mapBackground(background));

  const scenarioAutotests = document.feature.children
    .map((child) => child.scenario)
    .filter((scenario): scenario is Scenario => scenario !== undefined)
    .map((scenario) => mapScenario(document, scenario, setup));

  const ruleAutotests = document.feature.children
    .map((child) => child.rule)
    .filter((rule): rule is Rule => rule !== undefined)
    .flatMap((rule) => mapRule(document, rule, setup));

  return scenarioAutotests.concat(...ruleAutotests);
}

export function mapBackground(background: Background): ShortStep {
  return {
    title: background.name,
    description: background.description,
    steps: background.steps.map(mapStep),
  };
}

export function mapRule(document: GherkinDocument, rule: Rule, setup: ShortStep[]): AutotestPost[] {
  const ruleSetup = setup.concat(
    rule.children
      .map((child) => child.background)
      .filter((background): background is Background => background !== undefined)
      .map((background) => mapBackground(background))
  );

  return rule.children
    .map((child) => child.scenario)
    .filter((scenario): scenario is Scenario => scenario !== undefined)
    .map((scenario) => mapScenario(document, scenario, ruleSetup));
}

export function mapScenario(document: GherkinDocument, scenario: Scenario, setup: ShortStep[]): AutotestPost {
  const tags = parseTags(scenario.tags);
  const docTags = parseTags(document.feature!!.tags);
  const exampleSteps = scenario.examples.map(mapExamples);

  return {
    setup: exampleSteps.concat(setup),
    externalId: tags.externalId ?? docTags.externalId ?? Utils.getHash(tags.name ?? scenario.name),
    links: tags.links ?? docTags.links,
    name: tags.name ?? docTags.name ?? scenario.name,
    title: tags.title ?? docTags.title,
    description: tags.description ?? docTags.description ?? scenario.description,
    steps: scenario.steps.map(mapStep),
    workItemIds: tags.workItemIds ?? docTags.workItemIds,
    namespace: tags.nameSpace ?? docTags.nameSpace,
    classname: tags.className ?? docTags.className ?? document.feature?.name ?? scenario.name,
    labels: tags.labels?.map((label) => ({ name: label })) ?? docTags.labels?.map((label) => ({ name: label })),
    tags: tags.tags ?? docTags.tags,
    externalKey: scenario.name,
  };
}

//TODO: Implement using "parameters" fields
export function mapExamples(examples: Examples): ShortStep {
  let table: string[][] | Record<string, string>[];
  const body = examples.tableBody.map((row) => row.cells.map((cell) => cell.value));

  if (examples.tableHeader !== undefined) {
    const header = examples.tableHeader?.cells.map((cell) => cell.value);
    table = body.map((row) =>
      header.reduce((acc, key, i) => {
        acc[key] = row[i];
        return acc;
      }, {} as Record<string, string>)
    );
  } else {
    table = body;
  }
  const description = [examples.description];

  const tags = parseTags(examples.tags);

  if (Array.isArray(table)) {
    description.push(JSON.stringify(table));
  }

  return {
    title: tags.title ?? tags.name ?? (examples.name !== "" ? examples.name : "Parameters"),
    description: tags.description ?? description.join("\n\n"),
  };
}

export function mapStep(step: CucumberStep): ShortStep {
  return {
    title: `${step.keyword} ${step.text}`,
    description: step.docString?.content ?? mapDataTable(step.dataTable),
  };
}

function collectGherkinSteps(document: GherkinDocument): CucumberStep[] {
  const steps: CucumberStep[] = [];
  const feature = document.feature;
  if (feature === undefined) {
    return steps;
  }

  for (const child of feature.children) {
    if (child.background !== undefined) {
      steps.push(...child.background.steps);
    }
    if (child.scenario !== undefined) {
      steps.push(...child.scenario.steps);
    }
    if (child.rule !== undefined) {
      for (const ruleChild of child.rule.children) {
        if (ruleChild.background !== undefined) {
          steps.push(...ruleChild.background.steps);
        }
        if (ruleChild.scenario !== undefined) {
          steps.push(...ruleChild.scenario.steps);
        }
      }
    }
  }
  return steps;
}

export function findGherkinStep(documents: GherkinDocument[], pickleStep: PickleStep): CucumberStep | undefined {
  for (const document of documents) {
    for (const step of collectGherkinSteps(document)) {
      if (pickleStep.astNodeIds.includes(step.id)) {
        return step;
      }
    }
  }
  return undefined;
}

function collectScenarios(document: GherkinDocument): Scenario[] {
  const scenarios: Scenario[] = [];
  const feature = document.feature;
  if (feature === undefined) {
    return scenarios;
  }

  for (const child of feature.children) {
    if (child.scenario !== undefined) {
      scenarios.push(child.scenario);
    }
    if (child.rule !== undefined) {
      for (const ruleChild of child.rule.children) {
        if (ruleChild.scenario !== undefined) {
          scenarios.push(ruleChild.scenario);
        }
      }
    }
  }
  return scenarios;
}

export function findGherkinDocument(documents: GherkinDocument[], pickle: Pickle): GherkinDocument | undefined {
  const pickleUri = normalizeUri(pickle.uri);
  return documents.find((document) => document.uri !== undefined && normalizeUri(document.uri) === pickleUri);
}

export function findScenarioForPickle(document: GherkinDocument, pickle: Pickle): Scenario | undefined {
  for (const scenario of collectScenarios(document)) {
    if (pickle.astNodeIds.includes(scenario.id)) {
      return scenario;
    }
  }
  return undefined;
}

function collectFeatureBackgrounds(document: GherkinDocument): ShortStep[] {
  if (document.feature === undefined) {
    return [];
  }
  return document.feature.children
    .map((child) => child.background)
    .filter((background): background is Background => background !== undefined)
    .map((background) => mapBackground(background));
}

function findRuleForScenario(document: GherkinDocument, scenario: Scenario): Rule | undefined {
  if (document.feature === undefined) {
    return undefined;
  }
  for (const child of document.feature.children) {
    if (child.rule === undefined) {
      continue;
    }
    for (const ruleChild of child.rule.children) {
      if (ruleChild.scenario?.id === scenario.id) {
        return child.rule;
      }
    }
  }
  return undefined;
}

/** Same setup chain as mapScenario: Examples + feature/rule backgrounds. */
export function buildSetupForScenario(document: GherkinDocument, scenario: Scenario): ShortStep[] {
  let setup = collectFeatureBackgrounds(document);
  const rule = findRuleForScenario(document, scenario);
  if (rule !== undefined) {
    setup = setup.concat(
      rule.children
        .map((child) => child.background)
        .filter((background): background is Background => background !== undefined)
        .map((background) => mapBackground(background)),
    );
  }
  return scenario.examples.map(mapExamples).concat(setup);
}

/** @ExternalId from tags (pickle → scenario → feature) or hash(name). Never append suffixes. */
export function resolvePickleExternalId(documents: GherkinDocument[], pickle: Pickle): string {
  const document = findGherkinDocument(documents, pickle);
  const scenario = document !== undefined ? findScenarioForPickle(document, pickle) : undefined;
  const pickleTags = parseTags(pickle.tags);
  const scenarioTags = scenario !== undefined ? parseTags(scenario.tags) : parseTags([]);
  const docTags = document?.feature !== undefined ? parseTags(document.feature.tags) : parseTags([]);
  const name = pickleTags.name ?? scenarioTags.name ?? docTags.name ?? scenario?.name ?? pickle.name;
  return pickleTags.externalId ?? scenarioTags.externalId ?? docTags.externalId ?? Utils.getHash(name);
}

/**
 * Build autotest metadata for a pickle (same tag/fallback rules as mapScenario).
 * Resolves document by pickle.uri and scenario by pickle.astNodeIds.
 */
export function mapPickleToAutotestPost(
  documents: GherkinDocument[],
  pickle: Pickle,
  stepTitleFn: (step: PickleStep) => string,
): AutotestPost {
  const document = findGherkinDocument(documents, pickle);
  const scenario = document !== undefined ? findScenarioForPickle(document, pickle) : undefined;
  const externalId = resolvePickleExternalId(documents, pickle);

  const pickleTags = parseTags(pickle.tags);
  const scenarioTags = scenario !== undefined ? parseTags(scenario.tags) : parseTags([]);
  const docTags = document?.feature !== undefined ? parseTags(document.feature.tags) : parseTags([]);

  return {
    externalId,
    name: pickleTags.name ?? scenarioTags.name ?? docTags.name ?? scenario?.name ?? pickle.name,
    title: pickleTags.title ?? scenarioTags.title ?? docTags.title,
    description:
      pickleTags.description ?? scenarioTags.description ?? docTags.description ?? scenario?.description,
    links: pickleTags.links.length > 0 ? pickleTags.links : scenarioTags.links.length > 0 ? scenarioTags.links : docTags.links,
    labels:
      (pickleTags.labels.length > 0 ? pickleTags.labels : scenarioTags.labels.length > 0 ? scenarioTags.labels : docTags.labels)?.map(
        (label) => ({ name: label }),
      ),
    tags: pickleTags.tags.length > 0 ? pickleTags.tags : scenarioTags.tags.length > 0 ? scenarioTags.tags : docTags.tags,
    workItemIds:
      (pickleTags.workItemIds?.length ?? 0) > 0
        ? pickleTags.workItemIds
        : (scenarioTags.workItemIds?.length ?? 0) > 0
          ? scenarioTags.workItemIds
          : docTags.workItemIds,
    namespace: pickleTags.nameSpace ?? scenarioTags.nameSpace ?? docTags.nameSpace,
    classname:
      pickleTags.className ??
      scenarioTags.className ??
      docTags.className ??
      document?.feature?.name ??
      scenario?.name,
    setup:
      document !== undefined && scenario !== undefined
        ? buildSetupForScenario(document, scenario)
        : [],
    steps: pickle.steps.map((step) => ({ title: stepTitleFn(step) })),
    externalKey: scenario?.name ?? pickle.name,
  };
}

/** Pickle steps have text only; keyword comes from the linked Gherkin step. */
export function formatPickleStepTitle(documents: GherkinDocument[], pickleStep: PickleStep): string {
  const gherkinStep = findGherkinStep(documents, pickleStep);
  if (gherkinStep !== undefined) {
    return mapStep(gherkinStep).title;
  }
  return pickleStep.text;
}

export function mapDataTable(dataTable: DataTable | undefined): string | undefined {
  if (dataTable === undefined) {
    return undefined;
  }
  const keys = dataTable.rows[0].cells.map((cell) => cell.value);
  const rows = dataTable.rows.slice(1).map((row) => row.cells.map((cell) => cell.value));
  const objects = rows.map((value) =>
    keys.reduce((acc, key, i) => {
      acc[key] = value[i];
      return acc;
    }, {} as Record<string, string>)
  );
  return JSON.stringify(objects);
}
