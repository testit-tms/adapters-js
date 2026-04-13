import {
  AutoTestResultsForTestRunModel,
  TestRunState,
  TestRunV2ApiResult,
  // @ts-ignore
} from "testit-api-client";
import { BaseConverter, AdapterConfig, Outcome } from "../../common";
import { AutotestConverter, IAutotestConverter } from "../autotests";
import { AutotestResult, RunState, TestRunGet } from "./testruns.type";

export interface ITestRunConverter {
  toOriginState(state: RunState): TestRunState;
  toLocalState(state: TestRunState): RunState;
  toLocalTestRun(testRun: TestRunV2ApiResult): TestRunGet;
  toOriginAutotestResult(autotest: AutotestResult): AutoTestResultsForTestRunModel;
  toOriginAutotestResultInProgress(autotest: AutotestResult): AutoTestResultsForTestRunModel;
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

  toLocalTestRun(testRun: TestRunV2ApiResult): TestRunGet {
    return {
      id: testRun.id,
      name: testRun.name,
      startedOn: testRun.startedOn ?? undefined,
      completedOn: testRun.completedOn ?? undefined,
      description: testRun.description ?? undefined,
      launchSource: testRun.launchSource ?? undefined,
      stateName: this.toLocalState(testRun.stateName),
      attachments: testRun.attachments,
      links: testRun.links,
    };
  }
}
