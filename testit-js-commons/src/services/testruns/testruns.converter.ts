import { BaseConverter, AdapterConfig, Outcome } from "../../common";
import { AutotestConverter, IAutotestConverter } from "../autotests";
import { AutotestResult, RunState, TestRunGet } from "./testruns.type";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const AdaptersApi = require("../../adapters-api/dist/index");
const TestRunStateEnum = AdaptersApi.TestRunState;

export interface ITestRunConverter {
  toOriginState(state: RunState): any;
  toLocalState(state: any): RunState;
  toLocalTestRun(testRun: any): TestRunGet;
  toOriginAutotestResult(autotest: AutotestResult): any;
  toOriginAutotestResultInProgress(autotest: AutotestResult): any;
  toOriginTestResultUpdate(autotest: AutotestResult): any;
}

export class TestRunConverter extends BaseConverter implements ITestRunConverter {
  private autotestConverter: IAutotestConverter;

  constructor(config: AdapterConfig) {
    super(config);
    this.autotestConverter = new AutotestConverter(config);
  }

  toLocalState(state: any): RunState {
    // @ts-ignore
    return TestRunStateEnum[state] as RunState;
  }

  toOriginState(state: RunState): any {
    // @ts-ignore
    return TestRunStateEnum[state];
  }

  mapToStatusType(status: Outcome): string {
    const statusMap: Record<Outcome, string> = {
      Passed: "Succeeded",
      Failed: "Failed",
      Blocked: "Incomplete",
      Skipped: "Incomplete",
    };
    return statusMap[status];
  }

  toOriginAutotestResultInProgress(autotest: AutotestResult): any {
    return {
      ...this.toOriginAutotestResult(autotest),
      statusType: "InProgress",
    };
  }

  toOriginAutotestResult(autotest: AutotestResult): any {
    const model: any = {
      configurationId: this.config.configurationId,
      autoTestExternalId: autotest.autoTestExternalId,
      links: autotest.links?.map((link) => this.toOriginLink(link)),
      statusType: this.mapToStatusType(autotest.outcome),
      statusCode: null,
      stepResults: autotest.stepResults?.map((step) => this.toOriginStep(step)),
      setupResults: autotest.setupResults?.map((step) => this.toOriginStep(step)),
      teardownResults: autotest.teardownResults?.map((step) => this.toOriginStep(step)),
      attachments: autotest.attachments,
      message: autotest.message,
      traces: autotest.traces,
      parameters: autotest.parameters,
      properties: autotest.properties,
      failureReasonNames: undefined,
      outcome: undefined,
      startedOn: undefined,
      completedOn: undefined,
      duration: undefined,
    };

    if (autotest.duration !== undefined) {
      model.duration = autotest.duration;
    }

    if (autotest.startedOn !== undefined) {
      model.startedOn = autotest.startedOn;
    }

    if (autotest.completedOn !== undefined) {
      model.completedOn = autotest.completedOn;
    }

    return model;
  }

  toOriginTestResultUpdate(autotest: AutotestResult): any {
    const model: any = {
      outcome: this.toOriginOutcome(autotest.outcome),
      statusType: this.mapToStatusType(autotest.outcome),
      statusCode: null,
      links: autotest.links?.map((link) => this.toOriginLink(link)),
      stepResults: autotest.stepResults?.map((step) => this.toOriginStep(step)),
      setupResults: autotest.setupResults?.map((step) => this.toOriginStep(step)),
      teardownResults: autotest.teardownResults?.map((step) => this.toOriginStep(step)),
      attachments: autotest.attachments?.map((attachment) => ({ id: attachment.id })),
      message: autotest.message,
      trace: autotest.traces,
    };

    if (autotest.duration !== undefined) {
      model.durationInMs = autotest.duration;
      model.duration = autotest.duration;
    }

    return model;
  }

  toLocalTestRun(testRun: any): TestRunGet {
    return {
      id: testRun.id,
      name: testRun.name,
      startedOn: testRun.startedOn ?? undefined,
      completedOn: testRun.completedOn ?? undefined,
      description: testRun.description ?? undefined,
      launchSource: testRun.launchSource ?? undefined,
      stateName: this.toLocalState(testRun.stateName),
      attachments: testRun.attachments?.map((a: any) => ({ id: a.id })),
      links: testRun.links?.map((link: any) => ({
        url: link.url,
        id: link.id,
        title: link.title,
        description: link.description,
        hasInfo: link.hasInfo ?? true,
      })),
    };
  }
}
