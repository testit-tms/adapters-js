import { Attachment } from "./attachment";
import { OutcomeType } from "./outcome";
import { Parameters } from './parameters';

export interface TestResultStep {
    title: string;
    outcome: OutcomeType;
    description?: string;
    startedOn?: string;
    completedOn?: string;
    duration?: number;
    stepResults?: TestResultStep[];
    attachments?: Attachment[];
    parameters?: Parameters;
}
