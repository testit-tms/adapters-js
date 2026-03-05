import type {
  AutotestPost,
  AutotestResult,
  Outcome,
  ShortStep,
  Step,
} from "testit-js-commons";
import { Utils, Label, Link } from "testit-js-commons";

export interface StepData {
  id: string;
  name: string;
  start: number;
  stop?: number;
  duration?: number;
  status?: Outcome;
  statusDetails?: { message?: string; trace?: string };
  attachmentIds: string[];
  children: StepData[];
}

export interface TestData {
  fullNameSuffix: string;
  displayName: string;
  description?: string;
  title?: string;
  namespace?: string;
  classname?: string;
  labels: Label[];
  tags: string[];
  links: Link[];
  workItemIds: string[];
  start?: number;
  stop?: number;
  outcome: Outcome;
  duration?: number;
  statusDetails?: { message?: string; trace?: string };
  steps: StepData[];
  attachmentIds: string[];
  parameters?: Record<string, string>;
  properties?: Record<string, string>;
  externalKey: string;
}

function stepDataToStep(s: StepData): Step {
  const step: Step = {
    title: s.name,
    outcome: s.status,
    attachments: s.attachmentIds.map((id) => ({ id })),
    steps: s.children.length ? s.children.map(stepDataToStep) : undefined,
  };
  if (s.start != null) step.startedOn = new Date(s.start);
  if (s.stop != null) step.completedOn = new Date(s.stop);
  if (s.duration != null) step.duration = s.duration;
  else if (s.start != null && s.stop != null) step.duration = s.stop - s.start;
  if (s.statusDetails?.message) step.info = s.statusDetails.message;
  return step;
}

function stepDataToShortStep(s: StepData): ShortStep {
  return {
    title: s.name,
    steps: s.children.length ? s.children.map(stepDataToShortStep) : undefined,
  };
}

export function toAutotestPost(specPath: string, t: TestData): AutotestPost {
  const fullName = `${specPath}#${t.fullNameSuffix}`;
  const externalId = Utils.getHash(fullName);
  const name = (t.displayName ?? t.fullNameSuffix).replace(/#/g, " > ");
  const labels = t.labels?.map((l) => ({ name: l.name })) ?? [];
  return {
    externalId,
    name,
    title: t.title,
    description: t.description,
    workItemIds: t.workItemIds,
    namespace: t.namespace,
    classname: t.classname,
    links: t.links?.length ? t.links : undefined,
    labels: labels.length ? labels : undefined,
    tags: t.tags?.length ? t.tags : undefined,
    steps: t.steps.map(s => stepDataToShortStep(s)),
    externalKey: t.externalKey,
  };
}

export function toAutotestResult(
  externalId: string,
  t: TestData,
  outcome: Outcome,
  extraAttachmentIds: string[] = [],
): AutotestResult {
  const result: AutotestResult = {
    autoTestExternalId: externalId,
    outcome,
    attachments: [...t.attachmentIds, ...extraAttachmentIds].map((id) => ({ id })),
    stepResults: t.steps.map(s => stepDataToStep(s)),
  };
  if (t.links?.length) {
    result.links = t.links;
  }
  if (t.duration != null) {
    result.duration = t.duration;
  }
  if (t.start != null) {
    result.startedOn = new Date(t.start);
    if (t.duration != null) {
      result.completedOn = new Date(t.start + t.duration);
    } else if (t.stop != null) {
      result.completedOn = new Date(t.stop);
    }
  }
  if (t.parameters) {
    result.parameters = t.parameters;
  }
  if (t.properties) {
    result.properties = t.properties;
  }
  if (t.statusDetails?.message) result.message = t.statusDetails.message;
  if (t.statusDetails?.trace) result.traces = t.statusDetails.trace;
  return result;
}
