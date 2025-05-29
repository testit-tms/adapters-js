import {
  AvailableTestResultOutcome,
  LinkPostModel,
  LinkType as OriginLinkType,
  AttachmentPutModelAutoTestStepResultsModel,
  LinkPutModel,
  AutoTestStepModel,
} from "testit-api-client";
import { AdapterConfig, Link, LinkType, Outcome, ShortStep, Step } from "./types";

export interface IBaseConverter {
  toOriginOutcome(outcome: Outcome): AvailableTestResultOutcome;
  toLocalOutcome(outcome: AvailableTestResultOutcome): Outcome;

  toOriginLinkType(linkType: LinkType): OriginLinkType;
  toLocalLinkType(linkType: OriginLinkType): LinkType;

  toOriginLink(link: Link): LinkPostModel;
  toLocalLink(link: LinkPutModel): Link;

  toLocalShortStep(step: AutoTestStepModel): ShortStep;

  toOriginStep(step: Step): AttachmentPutModelAutoTestStepResultsModel;
}

export class BaseConverter implements IBaseConverter {
  constructor(protected readonly config: AdapterConfig) {}

  toOriginOutcome(outcome: Outcome): AvailableTestResultOutcome {
    return AvailableTestResultOutcome[outcome];
  }

  toLocalOutcome(outcome: AvailableTestResultOutcome): Outcome {
    return AvailableTestResultOutcome[outcome] as Outcome;
  }

  toOriginLinkType(linkType: LinkType): OriginLinkType {
    return OriginLinkType[linkType];
  }

  toLocalLinkType(linkType: OriginLinkType): LinkType {
    return OriginLinkType[linkType] as LinkType;
  }

  toOriginLink(link: Link): LinkPostModel {
    return {
      ...link,
      type: link.type ? this.toOriginLinkType(link.type) : undefined,
      hasInfo: true,
    };
  }

  toLocalLink(link: LinkPutModel): Link {
    return {
      url: link.url,
      title: link.title ?? link.url,
      description: link.description ?? undefined,
      type: link.type ? this.toLocalLinkType(link.type) : undefined,
    };
  }

  toLocalShortStep(step: AutoTestStepModel): ShortStep {
    return {
      title: step.title,
      description: step.description ?? undefined,
      steps: step.steps?.map((step) => this.toLocalShortStep(step)),
    };
  }

  toOriginStep(step: Step): AttachmentPutModelAutoTestStepResultsModel {
    const model: AttachmentPutModelAutoTestStepResultsModel = {
      title: step.title,
      description: step.description,
      parameters: step.parameters,
      attachments: step.attachments,
      outcome: step.outcome ? this.toOriginOutcome(step.outcome) : undefined,
      stepResults: step.steps?.map((step) => this.toOriginStep(step)),
    };

    if (step.duration !== undefined) {
      model.duration = step.duration;
    }

    return model;
  }
}
