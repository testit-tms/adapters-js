import {
  Background,
  DataTable,
  Examples,
  GherkinDocument,
  Rule,
  Scenario,
  Step,
  TestStepResultStatus,
} from '@cucumber/messages';
import { AutotestPost, AutotestStep, OutcomeType } from 'testit-api-client';
import { parseTags } from './utils';

export interface AutotestPostWithWorkItemId extends AutotestPost {
  workItemId?: string;
}

export function mapStatus(status: TestStepResultStatus): OutcomeType {
  switch (status) {
    case TestStepResultStatus.PASSED:
      return 'Passed';
    case TestStepResultStatus.FAILED:
      return 'Failed';
    case TestStepResultStatus.PENDING:
      return 'Pending';
    case TestStepResultStatus.SKIPPED:
      return 'Skipped';
    case TestStepResultStatus.UNKNOWN:
    case TestStepResultStatus.UNDEFINED:
    case TestStepResultStatus.AMBIGUOUS:
      return 'Blocked';
    default:
      throw new Error('Unknown status');
  }
}

export function mapDate(date: number): string {
  return new Date(date * 1000).toISOString();
}

export function mapDocument(
  document: GherkinDocument,
  projectId: string
): AutotestPostWithWorkItemId[] {
  if (document.feature === undefined) {
    return [];
  }

  const setup = document.feature.children
    .filter((child) => child.background !== undefined)
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    .map((child) => mapBackground(child.background!));
  const scenarioAutotests = document.feature.children
    .filter((child) => child.scenario !== undefined)
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    .map((child) => mapScenario(child.scenario!, projectId, setup));
  const ruleAutotests = document.feature.children
    .filter((child) => child.rule !== undefined)
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    .flatMap((child) => mapRule(child.rule!, projectId, setup));

  return scenarioAutotests.concat(...ruleAutotests);
}

export function mapBackground(background: Background): AutotestStep {
  return {
    title: background.name,
    description: background.description,
    steps: background.steps.map(mapStep),
  };
}

export function mapRule(
  rule: Rule,
  projectId: string,
  setup: AutotestStep[]
): AutotestPostWithWorkItemId[] {
  const ruleSetup = setup.concat(
    rule.children
      .filter((child) => child.background !== undefined)
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      .map((child) => mapBackground(child.background!))
  );
  return (
    rule.children
      .filter((child) => child.scenario !== undefined)
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      .map((child) => mapScenario(child.scenario!, projectId, ruleSetup))
  );
}

export function mapScenario(
  scenario: Scenario,
  projectId: string,
  setup: AutotestStep[]
): AutotestPostWithWorkItemId {
  const tags = parseTags(scenario.tags);
  if (tags.externalId === undefined) {
    return {
      externalId: '',
      name: scenario.name,
      projectId
    };
  }
  const exampleSteps = scenario.examples.map(mapExamples);
  return {
    setup: exampleSteps.concat(setup),
    externalId: tags.externalId,
    links: tags.links,
    name: tags.name ?? scenario.name,
    title: tags.title,
    description: tags.description ?? scenario.description,
    projectId,
    steps: scenario.steps.map(mapStep),
    workItemId: tags.workItemId,
    // Disable for now (BUG??)
    // labels:
    //   tags.labels.length > 0
    //     ? tags.labels.map((label) => ({ name: label }))
    //     : undefined,
  };
}

//TODO: Implement using "parameters" fields
export function mapExamples(examples: Examples): AutotestStep {
  let table: string[][] | Record<string, string>[] = [];
  const body = examples.tableBody.map((row) =>
    row.cells.map((cell) => cell.value)
  );
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

  if (table.length > 0) {
    description.push(JSON.stringify(table));
  }

  return {
    title: tags.title ?? tags.name ?? (examples.name !== '' ? examples.name : 'Parameters'),
    description: tags.description ?? description.join('\n\n'),
  };
}

export function mapStep(step: Step): AutotestStep {
  return {
    title: `${step.keyword} ${step.text}`,
    description: step.docString?.content ?? mapDataTable(step.dataTable),
  };
}

export function mapDataTable(
  dataTable: DataTable | undefined
): string | undefined {
  if (dataTable === undefined) {
    return undefined;
  }
  const keys = dataTable.rows[0].cells.map((cell) => cell.value);
  const rows = dataTable.rows
    .slice(1)
    .map((row) => row.cells.map((cell) => cell.value));
  const objects = rows.map((value) =>
    keys.reduce((acc, key, i) => {
      acc[key] = value[i];
      return acc;
    }, {} as Record<string, string>)
  );
  return JSON.stringify(objects);
}
