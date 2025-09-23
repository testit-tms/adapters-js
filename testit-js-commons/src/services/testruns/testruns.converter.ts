import {
  AutoTestResultsForTestRunModel,
  TestResultV2GetModel,
  TestRunState,
  TestRunV2ApiResult,
} from "testit-api-client";
import { BaseConverter, AdapterConfig } from "../../common";
import { AutotestConverter, IAutotestConverter } from "../autotests";
import { AutotestResult, RunState, TestRunGet } from "./testruns.type";

export interface ITestRunConverter {
  toOriginState(state: RunState): TestRunState;
  toLocalState(state: TestRunState): RunState;
  toLocalTestRun(testRun: TestRunV2ApiResult): TestRunGet;
  toOriginAutotestResult(autotest: AutotestResult): AutoTestResultsForTestRunModel;
}

export class TestRunConverter extends BaseConverter implements ITestRunConverter {
  private autotestConverter: IAutotestConverter;

  constructor(config: AdapterConfig) {
    super(config);
    this.autotestConverter = new AutotestConverter(config);
  }

  toLocalState(state: TestRunState): RunState {
    return TestRunState[state] as RunState;
  }

  toOriginState(state: RunState): TestRunState {
    return TestRunState[state];
  }

  toOriginAutotestResult(autotest: AutotestResult): AutoTestResultsForTestRunModel {
    const model: AutoTestResultsForTestRunModel = {
      configurationId: this.config.configurationId,
      autoTestExternalId: autotest.autoTestExternalId,
      links: autotest.links?.map((link) => this.toOriginLink(link)),
      statusCode: autotest.outcome,
      stepResults: autotest.stepResults?.map((step) => this.toOriginStep(step)),
      setupResults: autotest.setupResults?.map((step) => this.toOriginStep(step)),
      teardownResults: autotest.teardownResults?.map((step) => this.toOriginStep(step)),
      attachments: autotest.attachments,
      message: autotest.message,
      traces: autotest.traces,
      parameters: autotest.parameters,
      properties: autotest.properties,
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
    };
  }
}
