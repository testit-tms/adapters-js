import { TestError, TestStep } from "@playwright/test/reporter";
import { Step } from "testit-js-commons";
import { Status } from "./converter";

export type StatusDetails = {
    message?: string;
    trace?: string;
};

export function getStatusDetails (error: TestError): StatusDetails {
    const message = error.message && stripAscii(error.message);
    let trace = error.stack && stripAscii(error.stack);
    if (trace && message && trace.startsWith(`Error: ${message}`)) {
        trace = trace.substr(message.length + "Error: ".length);
    }
    return {
        message: message,
        trace: trace,
    };
};

export function isAllStepsWithPassedOutcome(steps: Step[]): boolean {
    return !steps.find((step: Step) => step.outcome === Status.FAILED);
}

export function isStep(step: TestStep): boolean {
    return step.category === "test.step" && !step.title.match(stepAttachRegexp);
}

export function stripAscii (str: string): string {
    return str.replace(asciiRegex, "");
};

export const stepAttachRegexp = /^stepattach_(\w{8}-\w{4}-\w{4}-\w{4}-\w{12})_/i;

const asciiRegex = new RegExp(
    "[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:[a-zA-Z\\d]*(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)|(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~]))",
    "g",
);
