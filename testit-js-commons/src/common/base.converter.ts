import { AdapterConfig, Link, LinkType, Outcome, ShortStep, Step } from "./types";

// Generated adapters-api client is bundled into lib/adapters-api/dist during build.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const AdaptersApi = require("../adapters-api/dist/index");
const AvailableTestResultOutcomeEnum = AdaptersApi.AvailableTestResultOutcome;
const OriginLinkTypeEnum = AdaptersApi.LinkType;

export interface IBaseConverter {
  toOriginOutcome(outcome: Outcome): any;
  toLocalOutcome(outcome: any): Outcome;

  toOriginLinkType(linkType: LinkType): any;
  toLocalLinkType(linkType: any): LinkType;

  toOriginLink(link: Link): any;
  toLocalLink(link: any): Link;

  toLocalShortStep(step: any): ShortStep;

  toOriginStep(step: Step): any;
}

export class BaseConverter implements IBaseConverter {
  constructor(protected readonly config: AdapterConfig) {}

  toOriginOutcome(outcome: Outcome): any {
    // @ts-ignore
    return AvailableTestResultOutcomeEnum[outcome];
  }

  toLocalOutcome(outcome: any): Outcome {
    // @ts-ignore
    return AvailableTestResultOutcomeEnum[outcome] as Outcome;
  }

  toOriginLinkType(linkType: LinkType): any {
    // @ts-ignore
    return OriginLinkTypeEnum[linkType];
  }

  toLocalLinkType(linkType: any): LinkType {
    // @ts-ignore
    return OriginLinkTypeEnum[linkType] as LinkType;
  }

  toOriginLink(link: Link): any {
    let type: any = "Related";
    if (link.type) {
      const mapped = this.toOriginLinkType(link.type);
      if (mapped != null) {
        type = mapped;
      }
    }
    return {
      ...link,
      type,
      hasInfo: true,
    };
  }

  toLocalLink(link: any): Link {
    return {
      url: link.url,
      title: link.title ?? link.url,
      description: link.description ?? undefined,
      type: link.type ? this.toLocalLinkType(link.type) : ("Related" as LinkType),
    };
  }

  toLocalShortStep(step: any): ShortStep {
    return {
      title: step.title,
      description: step.description ?? undefined,
      steps: step.steps?.map((s: any) => this.toLocalShortStep(s)),
    };
  }

  toOriginStep(step: Step): any {
    const model: any = {
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
