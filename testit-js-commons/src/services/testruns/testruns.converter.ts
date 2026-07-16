import {
  AutoTestResultsForTestRunModel,
  TestRunState,
  TestRunApiResult,
  // @ts-ignore
} from "../../adapters-api";
import { BaseConverter, AdapterConfig, Outcome } from "../../common";
import { AutotestConverter, IAutotestConverter } from "../autotests";
import { AutotestResult, RunState, TestRunGet } from "./testruns.type";

export interface ITestRunConverter {
  toOriginState(state: RunState): TestRunState;
  toLocalState(state: TestRunState): RunState;
  toLocalTestRun(testRun: TestRunApiResult): TestRunGet;
  toOriginAutotestResult(autotest: AutotestResult): AutoTestResultsForTestRunModel;
  toOriginAutotestResultInProgress(autotest: AutotestResult): AutoTestResultsForTestRunModel;
  toOriginTestResultUpdate(autotest: AutotestResult): unknown;
}

export class TestRunConverter extends BaseConverter implements ITestRunConverter {
  private autotestConverter: IAutotestConverter;

  constructor(config: AdapterConfig) {
    super(config);
    this.autotestConverter = new AutotestConverter(config);
  }

  toLocalState(state: TestRunState): RunState {
    // @ts-ignore
    return TestRunState[state] as RunState;
  }

  toOriginState(state: RunState): TestRunState {
    // @ts-ignore
    return TestRunState[state];
  }

  mapToStatusType(status: Outcome): string {
    const statusMap: Record<Outcome, string> = {
      Passed: "Succeeded",
      Failed: "Failed",
      Blocked: "Incomplete",
      Skipped: "Incomplete"
    };
    return statusMap[status];
  }

  toOriginAutotestResultInProgress(autotest: AutotestResult): AutoTestResultsForTestRunModel {
    return {
      ...this.toOriginAutotestResult(autotest),
      statusType: "InProgress",
    };
  }

  toOriginAutotestResult(autotest: AutotestResult): AutoTestResultsForTestRunModel {
    const model: AutoTestResultsForTestRunModel = {
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
      duration: undefined
    }

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

  toOriginTestResultUpdate(autotest: AutotestResult): unknown {
    const model: Record<string, unknown> = {
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

  toLocalTestRun(testRun: TestRunApiResult): TestRunGet {
    // @ts-ignore — adapters TestRunApiResult may omit optional fields present on older V2 model
    const run = testRun as TestRunApiResult & {
      startedOn?: Date;
      completedOn?: Date;
      description?: string;
      launchSource?: string;
    };
    return {
      id: run.id,
      name: run.name,
      startedOn: run.startedOn ?? undefined,
      completedOn: run.completedOn ?? undefined,
      description: run.description ?? undefined,
      launchSource: run.launchSource ?? undefined,
      stateName: this.toLocalState(run.stateName),
      attachments: run.attachments,
      links: run.links,
    };
  }
}
