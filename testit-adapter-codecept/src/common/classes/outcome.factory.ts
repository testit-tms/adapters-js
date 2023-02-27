import {OutcomeType} from "testit-api-client/dist/types/outcome";

export type SomeOutcome = 'passed' | 'failed' | 'skipped' | 'success';
export type Outcome = OutcomeType;

export class OutcomeFactory {
  public static create(outcome: SomeOutcome): Outcome {
    const outcomes: Record<SomeOutcome, Outcome> = {
      passed: 'Passed',
      success: 'Passed',
      failed: 'Failed',
      skipped: 'Skipped'
    };

    return outcomes[outcome] ?? 'Skipped';
  }

  public static isSkipped(outcome: SomeOutcome): boolean {
    return outcome === 'skipped';
  }
}