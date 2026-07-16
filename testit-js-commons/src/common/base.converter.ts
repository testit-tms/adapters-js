import type AvailableTestResultOutcome from "adapters-api/model/AvailableTestResultOutcome";
import type LinkPostModel from "adapters-api/model/LinkPostModel";
import type OriginLinkType from "adapters-api/model/LinkType";
import type AttachmentPutModelAutoTestStepResultsModel from "adapters-api/model/AttachmentPutModelAutoTestStepResultsModel";
import type LinkPutModel from "adapters-api/model/LinkPutModel";
import type AutoTestStepModel from "adapters-api/model/AutoTestStepModel";
import { AdapterConfig, Link, LinkType, Outcome, ShortStep, Step } from "./types";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const AdaptersApi = require("../adapters-api/dist/index") as typeof import("adapters-api/index");
const AvailableTestResultOutcomeEnum = AdaptersApi.AvailableTestResultOutcome;
const OriginLinkTypeEnum = AdaptersApi.LinkType;

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
    // @ts-ignore
    return AvailableTestResultOutcomeEnum[outcome];
  }

  toLocalOutcome(outcome: AvailableTestResultOutcome): Outcome {
    // @ts-ignore
    return AvailableTestResultOutcomeEnum[outcome] as Outcome;
  }

  toOriginLinkType(linkType: LinkType): OriginLinkType {
    // @ts-ignore
    return OriginLinkTypeEnum[linkType];
  }

  toLocalLinkType(linkType: OriginLinkType): LinkType {
    // @ts-ignore
    return OriginLinkTypeEnum[linkType] as LinkType;
  }

  toOriginLink(link: Link): LinkPostModel {
    const defaultType = "Related" as unknown as OriginLinkType;
    let type = defaultType;
    if (link.type) {
      const mapped = this.toOriginLinkType(link.type);
      if (mapped != null) {
        type = mapped;
      }
    }
    return {
      ...link,
      type: type as unknown as string,
      hasInfo: true,
    };
  }

  toLocalLink(link: LinkPutModel): Link {
    return {
      url: link.url,
      title: link.title ?? link.url,
      description: link.description ?? undefined,
      type: link.type
        ? this.toLocalLinkType(link.type as unknown as OriginLinkType)
        : ("Related" as LinkType),
    };
  }

  toLocalShortStep(step: AutoTestStepModel): ShortStep {
    return {
      title: step.title,
      description: step.description ?? undefined,
      steps: step.steps?.map((s) => this.toLocalShortStep(s)),
    };
  }

  toOriginStep(step: Step): AttachmentPutModelAutoTestStepResultsModel {
    const model: AttachmentPutModelAutoTestStepResultsModel = {
      title: step.title,
      description: step.description,
      parameters: step.parameters,
      attachments: step.attachments,
      outcome: step.outcome ? step.outcome : undefined,
      stepResults: step.steps?.map((s) => this.toOriginStep(s)),
    };

    if (step.duration !== undefined) {
      model.duration = step.duration;
    }
    if (step.startedOn !== undefined) {
      model.startedOn = step.startedOn;
    }
    if (step.completedOn !== undefined) {
      model.completedOn = step.completedOn;
    }

    return model;
  }
}
