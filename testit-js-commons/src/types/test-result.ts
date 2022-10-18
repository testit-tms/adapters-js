import { AttachmentPutModelAutoTestStepResultsModel, AttachmentPutModel, LabelPostModel } from "testit-api-client";
import { Attachment } from "./attachment";
import { Label } from "./label";
import { Link } from "./link";
import { OutcomeType } from "./outcome";
import { Parameters } from "./parameters";
import { Properties } from "./properties";
import { TestResultStep } from "./test-result-step";

export interface TestResult {
    externalId: string;
    displayName: string;
    outcome: OutcomeType;
    setupResults?: TestResultStep[];
    stepResults?: TestResultStep[];
    teardownResults?: TestResultStep[];
    message?: string;
    traces?: string;
    duration?: number;
    startedOn?: string;
    completedOn?: string;
    links?: Link[];
    resultLinks?: Link[];
    attachments?: Attachment[];
    parameters?: Parameters;
    properties?: Properties;
    labels?: Label[];
    title?: string;
    description?: string;
    workItemIds?: string[];
}
