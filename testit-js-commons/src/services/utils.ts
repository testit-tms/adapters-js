import { TestResultV2GetModel } from 'testit-api-client';
import { OutcomeType } from '../types/outcome';

export function calculateResultOutcome(
    outcomes: (string | null | undefined)[]
): OutcomeType {
    if (outcomes.some((outcome) => outcome === 'Failed')) {
        return 'Failed';
    }
    if (outcomes.some((outcome) => outcome === 'Blocked')) {
        return 'Blocked';
    }
    if (outcomes.some((outcome) => outcome === 'Skipped')) {
        return 'Skipped';
    }
    if (outcomes.every((outcome) => outcome === 'Passed')) {
        return 'Passed';
    }
    throw new Error('Cannot calculate result outcome');
}

export function parsedAutotests(
    autotests: TestResultV2GetModel[],
    configurationId: string
): Array<string> {
    const resolvedAutotests = [];

    for (const autotest of autotests) {
        if ( autotest.autoTest !== undefined && autotest.autoTest.externalId != undefined) {
            if (configurationId === autotest.configurationId) {
                resolvedAutotests.push(autotest.autoTest.externalId);
            }
        } else {
            console.error('The autotest cannot be read from the test run. The autotest is not defined.');
        }
    }

    return resolvedAutotests;
}
