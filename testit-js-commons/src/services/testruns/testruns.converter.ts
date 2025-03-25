import {
  AutoTestResultsForTestRunModel,
  TestResultV2GetModel,
  TestRunState,
  TestRunV2ApiResult,
} from "testit-api-client";
import { BaseConverter, AdapterConfig, Outcome } from "../../common";
import { AutotestConverter, IAutotestConverter } from "../autotests";
import { AutotestResult, AutotestResultGet, RunState, TestRunGet } from "./testruns.type";

export interface ITestRunConverter {
  toOriginState(state: RunState): TestRunState;
  toLocalState(state: TestRunState): RunState;

  toLocalTestRun(testRun: TestRunV2ApiResult): TestRunGet;

  toOriginAutotestResult(autotest: AutotestResult): AutoTestResultsForTestRunModel;
  toLocalAutotestResult(autotest: TestResultV2GetModel): AutotestResultGet;
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
    return {
      ...autotest,
      configurationId: this.config.configurationId,
      autoTestExternalId: autotest.autoTestExternalId,
      links: autotest.links?.map((link) => this.toOriginLink(link)),
      outcome: this.toOriginOutcome(autotest.outcome),
      stepResults: autotest.stepResults?.map((step) => this.toOriginStep(step)),
      setupResults: autotest.setupResults?.map((step) => this.toOriginStep(step)),
      teardownResults: autotest.teardownResults?.map((step) => this.toOriginStep(step)),
    };
  }

  toLocalAutotestResult(test: TestResultV2GetModel): AutotestResultGet {
    return {
      id: test.id,
      testRunId: test.testRunId,
      configurationId: test.configurationId,
      autoTestId: test.autoTestId ?? undefined,
      comment: test.comment ?? undefined,
      outcome: (test.outcome as Outcome) ?? undefined,
      links: test.links?.map((link) => this.toLocalLink(link)),
      attachments: test.attachments ?? undefined,
      parameters: test.parameters ?? undefined,
      properties: test.properties ?? undefined,
      completedOn: test.completedOn ?? undefined,
      message: test.message ?? undefined,
      traces: test.traces ?? undefined,
      startedOn: test.startedOn ?? undefined,
      autoTest: test.autoTest ? this.autotestConverter.toLocalAutotestByModel(test.autoTest) : undefined,
    };
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
      testResults: testRun.testResults?.map((test: any) => this.toLocalAutotestResult(test)),
    };
  }
}
