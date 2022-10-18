import {
    TestStepResultStatus,
} from '@cucumber/messages';
import { OutcomeType } from 'testit-js-commons/types/outcome';

export function mapStatus(status: TestStepResultStatus): OutcomeType {
    switch (status) {
        case TestStepResultStatus.PASSED:
            return 'Passed';
        case TestStepResultStatus.FAILED:
            return 'Failed';
        case TestStepResultStatus.PENDING:
            return 'Pending';
        case TestStepResultStatus.SKIPPED:
            return 'Skipped';
        case TestStepResultStatus.UNKNOWN:
        case TestStepResultStatus.UNDEFINED:
        case TestStepResultStatus.AMBIGUOUS:
            return 'Blocked';
        default:
            throw new Error('Unknown status');
    }
}

export function mapDate(date: number): string {
    return new Date(date * 1000).toISOString();
}
