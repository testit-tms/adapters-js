import {
  AttachmentPut,
  AttachmentPutModelAutotestStepResults,
  AutotestStep,
  Parameters,
} from 'testit-api-client';
import { StepData } from './types';

export function mapDate(date: number): string {
  return new Date(date).toISOString();
}

export function mapStep(step: StepData): AutotestStep {
  return {
    title: step.title,
    description: step.description,
  };
}

export function mapParams(params: any): Parameters {
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
      }, {} as Parameters);
    default:
      return {};
  }
}

export function mapStepResult(
  step: StepData
): AttachmentPutModelAutotestStepResults {
  return {
    title: step.title,
    description: step.description,
    attachments: mapAttachments(step.attachments),
  };
}

export function mapAttachments(attachments: string[]) {
  return attachments.map<AttachmentPut>((id) => ({ id }));
}
