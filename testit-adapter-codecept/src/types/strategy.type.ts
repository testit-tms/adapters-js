import { Origin } from './origin.type';

export interface Strategy {
  bootstrap(): Promise<any>;
  teardown(): Promise<any>;

  beforeTest(test: Mocha.Test): Promise<void>;
  transferTestsToSystem(suite: Mocha.Suite): Promise<void>;
  transferRunsToSystem(suite: Mocha.Suite): Promise<void>;
  collect(id: string, data: Origin.TestMetadata): void;
}

