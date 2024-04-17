# Test IT TMS adapters for Playwright
![Test IT](https://raw.githubusercontent.com/testit-tms/adapters-js/master/images/banner.png)

## Getting Started

### Installation
```
npm install testit-adapter-playwright
```

## Usage

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

Add Adapter to Playwright file configuration:

```ts
import { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
  reporter: [
    ['testit-adapter-playwright']
  ],
};

export default config;
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
  "adapterMode": "ADAPTER_MODE",
  "automaticCreationTestCases": "AUTOMATIC_CREATION_TEST_CASES"
}
```

#### Parallel run
To create and complete TestRun you can use the Test IT CLI:

```
$ export TMS_TOKEN=<YOUR_TOKEN>
$ testit testrun create
  --url https://tms.testit.software \
  --project-id 5236eb3f-7c05-46f9-a609-dc0278896464 \
  --testrun-name "New test run" \
  --output tmp/output.txt

$ export TMS_TEST_RUN_ID=$(cat tmp/output.txt)  

$ npx playwright test

$ testit testrun complete
  --url https://tms.testit.software \
  --testrun-id $(cat tmp/output.txt) 
```

### Methods

Methods can be used to specify information about autotest.

Description of metadata methods:
- `testit.workItemIds` - linking an autotest to a test case
- `testit.displayName` - name of the autotest in the Test IT system (can be replaced with documentation strings)
- `testit.externalId` - ID of the autotest within the project in the Test IT System
- `testit.title` - title in the autotest card
- `testit.description` - description in the autotest card
- `testit.labels` - tags in the work item
- `testit.links` - links in the autotest card
- `testit.namespace` - directory in the TMS system (default - directory's name of test)
- `testit.classname` - subdirectory in the TMS system (default - file's name of test)

Description of methods:
- `testit.addLinks` - links in the autotest result
- `testit.addAttachments` - uploading files in the autotest result
- `testit.addMessage` - information about autotest in the autotest result
- `testit.step` - information about step in the autotest result

### Examples

#### Simple test
```js
import { test } from "@playwright/test";
import { testit } from "testit-adapter-playwright";

test('All annotations', async () => {
  testit.externalId('all_annotations');
  testit.displayName('All annotations');
  testit.title('All annotations title');
  testit.description('Test with all annotations');
  testit.labels(['label1', 'label2']);

  testit.addMessage('This is a message');
  testit.addLinks([
    {
      url: 'https://www.google.com',
      title: 'Google',
      description: 'This is a link to Google',
      type: 'Related',
    },
  ]);

  testit.addAttachment('file01.txt', 'Content', {contentType: "text/markdown",});

  await testit.step("step with title", async () => {
  });
});
```

#### Parameterized test
```js
const people = ['Alice', 'Bob'];
for (const name of people) {
  test(`testing with ${name}`, async () => {
    testit.params(people);
  });
}
```


# Contributing

You can help to develop the project. Any contributions are **greatly appreciated**.

* If you have suggestions for adding or removing projects, feel free to [open an issue](https://github.com/testit-tms/adapters-js/issues/new) to discuss it, or directly create a pull request after you edit the *README.md* file with necessary changes.
* Please make sure you check your spelling and grammar.
* Create individual PR for each suggestion.
* Please also read through the [Code Of Conduct](https://github.com/testit-tms/adapters-js/blob/master/CODE_OF_CONDUCT.md) before posting your first idea as well.

# License

Distributed under the Apache-2.0 License. See [LICENSE](https://github.com/testit-tms/adapters-js/blob/master/LICENSE.md) for more information.

