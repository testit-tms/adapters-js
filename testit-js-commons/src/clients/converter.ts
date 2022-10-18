import {
    AutoTestPostModel,
    AutoTestPutModel,
    AutoTestResultsForTestRunModel,
    LinkPostModel,
    LinkPutModel,
    LinkType,
} from "testit-api-client";
import { TestResult } from "../types/test-result";

export class Converter {

    static convertTestResultToAutoTestPostModel(
        testResult: TestResult,
        projectId: string): AutoTestPostModel {
        return {
            'externalId': testResult.externalId,
            'projectId': projectId,
            'name': testResult.displayName,
            'setup': testResult.setupResults,
            'steps': testResult.stepResults,
            'teardown': testResult.teardownResults,
            'links': testResult.links,
            'labels': testResult.labels,
            'title': testResult.title,
            'description': testResult.description,
        };
    }

    static convertTestResultToAutoTestPutModel(
        testResult: TestResult,
        projectId: string): AutoTestPutModel {
        return {
            'externalId': testResult.externalId,
            'projectId': projectId,
            'name': testResult.displayName,
            'setup': testResult.setupResults,
            'steps': testResult.stepResults,
            'teardown': testResult.teardownResults,
            'links': testResult.links,
            'labels': testResult.labels,
            'title': testResult.title,
            'description': testResult.description,
        };
    }

    static convertTestResultToAutoTestResultsForTestRunModel(
        testResult: TestResult,
        configurationId: string): AutoTestResultsForTestRunModel {
        return {
            'autoTestExternalId': testResult.externalId,
            'configurationId': configurationId,
            'outcome': testResult.outcome,
            'setupResults': testResult.setupResults,
            'stepResults': testResult.stepResults,
            'teardownResults': testResult.teardownResults,
            'parameters': testResult.parameters,
            'duration': testResult.duration,
            'startedOn': testResult.startedOn,
            'completedOn': testResult.completedOn,
            'links': testResult.resultLinks,
            'traces': testResult.traces,
            'message': testResult.message,
            'attachments': testResult.attachments,
        };
    }

    static convertLinkToLinkPostModel(
        url: string,
        title?: string,
        type?: LinkType,
        description?: string
    ): LinkPostModel {
        if (type !== undefined) {
            return {
                'url': url,
                'title': title,
                'type': type,
                'description': description,
            }
        }

        return {
            'url': url,
            'title': title,
            'description': description,
        }
    }

    static convertLinkToLinkPutModel(
        url: string,
        title?: string,
        type?: LinkType,
        description?: string
    ): LinkPutModel {
        if (type !== undefined) {
            return {
                'url': url,
                'title': title,
                'type': type,
                'description': description,
            }
        }

        return {
            'url': url,
            'title': title,
            'description': description,
        }
    }
}
