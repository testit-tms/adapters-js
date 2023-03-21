import { AdapterMode } from '../strategies/strategy.factory';

export namespace Origin {
  export interface TestConfig {
    title?: string,
    displayName?: string,
    description?: string,
    externalId?: string,
    links: LinkPost[],
    labels?: string[],
    workitemIds?: []
  }

  export interface TestText {
    name: string;
    content: string;
  }

  export interface TestMetadata {
    links?: LinkPost[];
    attachments?: string[];
    message?: string;
    text?: TestText
  }

  export interface LinkPost {
    title?: string;
    url: string;
    description?: string;
    type?: LinkType;
    hasInfo?: boolean;
  }
  
  export type LinkType =
  | 'Related'
  | 'BlockedBy'
  | 'Defect'
  | 'Issue'
  | 'Requirement'
  | 'Repository';

  export interface Config {
    url?: string
    privateToken?: string,
    projectId?: string,
    configurationId?: string,
    testRunId?: string,
    testRunName?: string,
    adapterMode?: AdapterMode;
    automaticCreationTestCases?: boolean;
    certValidation?: boolean;
    configFile?: string,
    __DEV?: boolean
  }

  export type EnvironmentsConfig = Partial<{
    TMS_URL: string,
    TMS_PRIVATE_TOKEN: string,
    TMS_PROJECT_ID: string,
    TMS_CONFIGURATION_ID: string,
    TMS_TEST_RUN_ID: string,
    TMS_TEST_RUN_NAME: string,
    TMS_ADAPTER_MODE: AdapterMode,
    TMS_AUTOMATIC_CREATION_TEST_CASES: boolean,
    TMS_CERT_VALIDATION: boolean,
    TMS_CONFIG_FILE: string,
  }>
}
