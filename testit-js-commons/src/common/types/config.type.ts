export type AdapterMode = 0 | 1 | 2;

export interface CliOptions {
  tmsUrl: string;
  tmsPrivateToken: string;
  tmsProjectId: string;
  tmsConfigurationId: string;
  tmsTestRunId: string;
  tmsTestRunName: string;
  tmsAdapterMode: AdapterMode;
  tmsConfigFile: string;
  tmsAutomaticCreationTestCases: boolean;
}

export interface EnvironmentOptions {
  TMS_URL: string;
  TMS_PRIVATE_TOKEN: string;
  TMS_PROJECT_ID: string;
  TMS_CONFIGURATION_ID: string;
  TMS_TEST_RUN_ID: string;
  TMS_TEST_RUN_NAME: string;
  TMS_ADAPTER_MODE: AdapterMode;
  TMS_CONFIG_FILE: string;
  TMS_AUTOMATIC_CREATION_TEST_CASES: boolean;
  TMS_CERT_VALIDATION: boolean;
}

export interface AdapterConfig {
  url: string;
  privateToken: string;
  projectId: string;
  configurationId: string;
  testRunId: string;
  testRunName?: string;
  adapterMode?: AdapterMode;
  automaticCreationTestCases?: boolean;
  certValidation?: boolean;
}
