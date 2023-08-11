import { AdapterConfig, Metadata, DynamicMethods } from "testit-js-commons";
import { ITestStep } from "./step";

declare module "mocha" {
  export interface Context extends Metadata, Methods {}
}

export interface ReporterOptions extends Mocha.MochaOptions {
  tmsOptions: AdapterConfig;
}

export interface Methods extends DynamicMethods {
  addSteps: (title: string, stepConstructor?: (step: ITestStep) => void) => void;
}

export type Context = Mocha.Context & Metadata & Methods;

export interface Test extends Mocha.Test {
  ctx?: Context;
}

export interface Hook extends Mocha.Hook {
  ctx?: Context;
}

export type LinkType = "Related" | "BlockedBy" | "Defect" | "Issue" | "Requirement" | "Repository";

export interface Link {
  title: string;
  url: string;
  description?: string;
  type?: LinkType;
  hasInfo?: boolean;
}
