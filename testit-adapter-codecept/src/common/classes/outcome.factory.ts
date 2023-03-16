export type SomeOutcome = 'passed' | 'failed' | 'skipped' | 'success';

export class OutcomeFactory {
  public static create(outcome: SomeOutcome): string {
    const outcomes: Record<SomeOutcome, string> = {
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