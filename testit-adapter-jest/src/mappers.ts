import {
  AttachmentModel,
  AttachmentModelAutoTestStepResultsModel,
  AutoTestStepModel,
  LinkPostModel,
  LinkType,
} from 'testit-api-client';
import { LinkPost, StepData } from './types';

export function mapDate(date: number): string {
  return new Date(date).toISOString();
}

export function mapStep(step: StepData): AutoTestStepModel {
  return {
    title: step.title,
    description: step.description,
  };
}

export function mapParams(params: any): Record<string, string> {
  switch (typeof params) {
    case 'string':
    case 'bigint':
    case 'number':
    case 'boolean':
      return { value: params.toString() };
    case 'object':
      if (params === null) {
        return {};
      }
      return Object.keys(params).reduce((acc, key) => {
        acc[key] = params[key].toString();
        return acc;
      }, {} as Record<string, string>);
    default:
      return {};
  }
}

export function mapStepResult(
  step: StepData
): AttachmentModelAutoTestStepResultsModel {
  return {
    title: step.title,
    description: step.description,
    attachments: mapAttachments(step.attachments),
  };
}

export function mapAttachments(attachments: string[]) {
  return attachments.map<AttachmentModel>((id) => ({
    id: id,
    name: '',
    type: '',
    fileId: '',
    size: 0}));
}

export function mapLinks(links: LinkPost[]): LinkPostModel[] {
  return links?.map(link => {
    const model = new LinkPostModel();

    model.url = link.url;
    model.title = link.title;
    model.description = link.description;

    if (link.type !== undefined) {
        model.type = LinkType[link.type];
    }

    return model;
  });
}