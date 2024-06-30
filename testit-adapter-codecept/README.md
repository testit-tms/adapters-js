# Test IT TMS adapters for Codecept
![Test IT](https://raw.githubusercontent.com/testit-tms/adapters-js/master/images/banner.png)

## Getting Started

### Installation
```
npm install testit-adapter-codecept
```

## Usage

### Configuration

| Description                                                                                                                                                                                                                                                                                                                                                                            | File property                     | Environment variable                       |
|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------|--------------------------------------------|
| Location of the TMS instance                                                                                                                                                                                                                                                                                                                                                           | url                               | TMS_URL                                    |
| API secret key [How to getting API secret key?](https://github.com/testit-tms/.github/tree/main/configuration#privatetoken)                                                                                                                                                                                                                                                            | privateToken                      | TMS_PRIVATE_TOKEN                          |
| ID of project in TMS instance [How to getting project ID?](https://github.com/testit-tms/.github/tree/main/configuration#projectid)                                                                                                                                                                                                                                                    | projectId                         | TMS_PROJECT_ID                             |
| ID of configuration in TMS instance [How to getting configuration ID?](https://github.com/testit-tms/.github/tree/main/configuration#configurationid)                                                                                                                                                                                                                                  | configurationId                   | TMS_CONFIGURATION_ID                       |
| ID of the created test run in TMS instance.<br/>It's necessary for **adapterMode** 0 or 1                                                                                                                                                                                                                                                                                              | testRunId                         | TMS_TEST_RUN_ID                            |
| Parameter for specifying the name of test run in TMS instance (**It's optional**). If it is not provided, it is created automatically                                                                                                                                                                                                                                                  | testRunName                       | TMS_TEST_RUN_NAME                          |
| Adapter mode. Default value - 0. The adapter supports following modes:<br/>0 - in this mode, the adapter filters tests by test run ID and configuration ID, and sends the results to the test run<br/>1 - in this mode, the adapter sends all results to the test run without filtering<br/>2 - in this mode, the adapter creates a new test run and sends results to the new test run | adapterMode                       | TMS_ADAPTER_MODE                           |
| It enables/disables certificate validation (**It's optional**). Default value - true                                                                                                                                                                                                                                                                                                   | certValidation                    | TMS_CERT_VALIDATION                        |
| Mode of automatic creation test cases (**It's optional**). Default value - false. The adapter supports following modes:<br/>true - in this mode, the adapter will create a test case linked to the created autotest (not to the updated autotest)<br/>false - in this mode, the adapter will not create a test case                                                                    | automaticCreationTestCases        | TMS_AUTOMATIC_CREATION_TEST_CASES          |
| Mode of automatic updation links to test cases (**It's optional**). Default value - false. The adapter supports following modes:<br/>true - in this mode, the adapter will update links to test cases<br/>false - in this mode, the adapter will not update link to test cases                                                                                                         | automaticUpdationLinksToTestCases | TMS_AUTOMATIC_UPDATION_LINKS_TO_TEST_CASES |

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
      enabled: true,
      // logging
      __DEV: false
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

Create .env config or file config with default name tms.config.json in the root directory of the project

```json
{
  "url": "URL",
  "privateToken": "USER_PRIVATE_TOKEN",
  "projectId": "PROJECT_ID",
  "configurationId": "CONFIGURATION_ID",
  "testRunId": "TEST_RUN_ID",
  "testRunName": "TEST_RUN_NAME",
  "adapterMode": ADAPTER_MODE,
  "automaticCreationTestCases": AUTOMATIC_CREATION_TEST_CASES,
  "automaticUpdationLinksToTestCases": AUTOMATIC_UPDATION_LINKS_TO_TEST_CASES
}
```

#### Parallel run
To create and complete TestRun you can use the Test IT CLI (use adapterMode 1 for parallel run):

```
$ export TMS_TOKEN=<YOUR_TOKEN>
$ testit testrun create
  --url https://tms.testit.software \
  --project-id 5236eb3f-7c05-46f9-a609-dc0278896464 \
  --testrun-name "New test run" \
  --output tmp/output.txt

$ export TMS_TEST_RUN_ID=$(cat tmp/output.txt)

$ npx codeceptjs run

$ testit testrun complete
  --url https://tms.testit.software \
  --testrun-id $(cat tmp/output.txt)
```

### Methods

Methods can be used to specify information about autotest.

Description of metadata methods:
- `workItemIds` - a method that links autotests with manual tests. Receives the array of manual tests' IDs
- `displayName` - internal autotest name (used in Test IT)
- `externalId` - unique internal autotest ID (used in Test IT)
- `title` - autotest name specified in the autotest card. If not specified, the name from the displayName method is used
- `description` - autotest description specified in the autotest card
- `labels` - tags listed in the autotest card
- `link` - links listed in the autotest card
- `namespace` - directory in the TMS system
- `classname` - subdirectory in the TMS system

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
    workItemIds: ['1140']
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
