import { Origin } from "./origin.type";

export interface Strategy {
  bootstrap(): Promise<void>;
  teardown(): Promise<void>;

  beforeTest(test: Mocha.Test): Promise<void>;
  transferTestsToSystem(suite: { tests: Mocha.Test[] }): Promise<void>;
  transferRunsToSystem(suite: { tests: Mocha.Test[] }): Promise<void>;
  collect(id: string, data: Origin.TestMetadata): void;
}
