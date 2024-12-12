import {
  Background,
  DataTable,
  Examples,
  GherkinDocument,
  Rule,
  Scenario,
  Step as CucumberStep,
} from "@cucumber/messages";
import { parseTags } from "./utils";
import { AutotestPost, ShortStep, Utils } from "testit-js-commons";
import { config } from 'dotenv';

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
    namespace: tags.nameSpace ?? docTags.nameSpace ?? process.env.DEFAULT_TESTIT_NAMESPACE,
    classname: tags.className ?? docTags.className ?? document.feature?.name ?? scenario.name,
    labels: tags.labels?.map((label) => ({ name: label })) ?? docTags.labels?.map((label) => ({ name: label })),
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
