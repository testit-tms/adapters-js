export namespace Codecept {
  export type Status = "success" | "failure";

  export interface Step {
    name: string;
    args: string[];
    status: Status;
    duration: number;
    startTime: number;
    endTime: number;
    finishedAt: number;
    steps: Step[];
    startedAt: number;
  }

  export interface Test<T = any> extends Mocha.Test {
    id: string;
    steps: Step[];
    startedAt: number;
    config: any;
    inject: any;
    artifacts: any;
    err?: {
      stack: string;
      cliMessage?: () => string;
    };
    opts: T;
  }
}
