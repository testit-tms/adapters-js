# Test IT TMS adapters for Codecept
![Test IT](https://raw.githubusercontent.com/testit-tms/adapters-js/master/images/banner.png)

## Getting Started

### Installation
```
npm install testit-adapter-codecept
```

## Usage

### API client

To use adapter you need to install `testit-api-client`:
```
npm install testit-api-client
```

### Configuration

| Description                                                                                                                                                                                                                                                                                                                                                                            | Property                   | Environment variable              | CLI argument                  |
|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------------|-----------------------------------|-------------------------------|
| Location of the TMS instance                                                                                                                                                                                                                                                                                                                                                           | url                        | TMS_URL                           | tmsUrl                        |
| API secret key [How to getting API secret key?](https://github.com/testit-tms/.github/tree/main/configuration#privatetoken)                                                                                                                                                                                                                                                            | privateToken               | TMS_PRIVATE_TOKEN                 | tmsPrivateToken               |
| ID of project in TMS instance [How to getting project ID?](https://github.com/testit-tms/.github/tree/main/configuration#projectid)                                                                                                                                                                                                                                                    | projectId                  | TMS_PROJECT_ID                    | tmsProjectId                  |
| ID of configuration in TMS instance [How to getting configuration ID?](https://github.com/testit-tms/.github/tree/main/configuration#configurationid)                                                                                                                                                                                                                                  | configurationId            | TMS_CONFIGURATION_ID              | tmsConfigurationId            |
| ID of the created test run in TMS instance.<br/>It's necessary for **adapterMode** 0 or 1                                                                                                                                                                                                                                                                                              | testRunId                  | TMS_TEST_RUN_ID                   | tmsTestRunId                  |
| Parameter for specifying the name of test run in TMS instance (**It's optional**). If it is not provided, it is created automatically                                                                                                                                                                                                                                                  | testRunName                | TMS_TEST_RUN_NAME                 | tmsTestRunName                |
| Adapter mode. Default value - 0. The adapter supports following modes:<br/>0 - in this mode, the adapter filters tests by test run ID and configuration ID, and sends the results to the test run<br/>1 - in this mode, the adapter sends all results to the test run without filtering<br/>2 - in this mode, the adapter creates a new test run and sends results to the new test run | adapterMode                | TMS_ADAPTER_MODE                  | tmsAdapterMode                |
| It enables/disables certificate validation (**It's optional**). Default value - true                                                                                                                                                                                                                                                                                                   | certValidation             | TMS_CERT_VALIDATION               | tmsCertValidation             |
| Mode of automatic creation test cases (**It's optional**). Default value - false. The adapter supports following modes:<br/>true - in this mode, the adapter will create a test case linked to the created autotest (not to the updated autotest)<br/>false - in this mode, the adapter will not create a test case                                                                    | automaticCreationTestCases | TMS_AUTOMATIC_CREATION_TEST_CASES | tmsAutomaticCreationTestCases |

Add TestITHelper and TestITPlugin to Codecept file configuration 

```ts
export const config: CodeceptJS.MainConfig = {
  tests: './**/*_test.ts',
  output: './output',
  helpers: {
    Playwright: {
      url: 'http://localhost',
      show: false,
      browser: 'chromium'
    },
    TestITHelper: {
      require: 'testit-adapter-codecept/build/helper.js'
    }
  },
  plugins: {
    TestITPlugin: {
      require: 'testit-adapter-codecept/build/bootstrap.js',
      enabled: true
    }
  },
  include: {},
  name: 'codecept-test-it-testing'
}
```

Create step.d.ts file and import TestMetadataHelper

```ts
type TestITHelper = import('testit-adapter-codecept/build/helper').TestMetadataHelper;

declare namespace CodeceptJS {
  interface SupportObject { I: I, current: any }
  interface Methods extends Playwright, TestITHelper {}
  interface I extends WithTranslation<Methods>{}
  namespace Translation {
    interface Actions {}
  }
}
```

#### File

Create .env config or file config with default name testit-adapter.config.json in the root directory of the project

```json
{
  "url": "URL",
  "privateToken": "USER_PRIVATE_TOKEN",
  "projectId": "PROJECT_ID",
  "configurationId": "CONFIGURATION_ID",
  "testRunId": "TEST_RUN_ID",
  "testRunName": "TEST_RUN_NAME",
  "adapterMode": ADAPTER_MODE,
  "automaticCreationTestCases": AUTOMATIC_CREATION_TEST_CASES
}
```

### Methods

Methods can be used to specify information about autotest.

Description of metadata methods:
- `workItemIds` - linking an autotest to a test case
- `displayName` - name of the autotest in the Test IT system (can be replaced with documentation strings)
- `externalId` - ID of the autotest within the project in the Test IT System
- `title` - title in the autotest card
- `description` - description in the autotest card
- `labels` - tags in the work item
- `link` - links in the autotest card
- `nameSpace` - directory in the TMS system
- `className` - subdirectory in the TMS system

Description of methods:
- `addLinks` - links in the autotest result
- `addAttachments` - uploading files in the autotest result
- `addMessage` - information about autotest in the autotest result

### Examples

#### Simple test
```ts
Scenario(
  'Scenario name',
  {
    externalId: '1',
    displayName: 'Name',
    title: 'Title',
    description: 'Description',
    labels: ['Custom label'],
    links: [
      {
        title: 'Google about this error',
        description: 'Google documents',
        url: 'https://google.com',
        type: 'Requirement',
        hasInfo: true
      }
    ],
    workitemIds: ['1140']
  },
  ({ I }) => {
    I.amOnPage('https://github.com');
    I.addLinks([
      {
        title: 'Github page',
        description: 'Github SPA page',
        url: 'https://github.com',
        type: 'Repository',
        hasInfo: true
      }
    ])
    I.addMessage('Hello');
    I.see('GitHub');
  });

```

#### Parameterized test
```ts
const data = new DataTable(['target', 'element']);

data.add(['https://mail.google.com', '//a[contains(., "Почта")]']);
data.add(['https://www.wikipedia.org', '//input']);
data.add(['https://google.com', '//a[contains(., "Google")]']);

Data(data).Scenario('Should render main page for all users', ({ I, current }) => {
  I.amOnPage(current.target);
  I.seeElement(current.element);
})
```


# Contributing

You can help to develop the project. Any contributions are **greatly appreciated**.

* If you have suggestions for adding or removing projects, feel free to [open an issue](https://github.com/testit-tms/adapters-js/issues/new) to discuss it, or directly create a pull request after you edit the *README.md* file with necessary changes.
* Please make sure you check your spelling and grammar.
* Create individual PR for each suggestion.
* Please also read through the [Code Of Conduct](https://github.com/testit-tms/adapters-js/blob/master/CODE_OF_CONDUCT.md) before posting your first idea as well.

# License

Distributed under the Apache-2.0 License. See [LICENSE](https://github.com/testit-tms/adapters-js/blob/master/LICENSE.md) for more information.

