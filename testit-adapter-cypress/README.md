# Test IT TMS adapters for Cypress
![Test IT](https://raw.githubusercontent.com/testit-tms/adapters-js/master/images/banner.png)

## Getting Started

### Installation
```
npm install testit-adapter-cypress
```

## Usage

### Configuration

| Description                                                                                                                                                                                                                                                                                                                                                                            | File property                     | Environment variable                       |
|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------|--------------------------------------------|
| Location of the TMS instance                                                                                                                                                                                                                                                                                                                                                           | url                               | TMS_URL                                    |
| API secret key [How to getting API secret key?](https://github.com/testit-tms/.github/tree/main/configuration#privatetoken)                                                                                                                                                                                                                                                            | privateToken                      | TMS_PRIVATE_TOKEN                          |
| ID of project in TMS instance [How to getting project ID?](https://github.com/testit-tms/.github/tree/main/configuration#projectid)                                                                                                                                                                                                                                                    | projectId                         | TMS_PROJECT_ID                             |
| ID of configuration in TMS instance [How to getting configuration ID?](https://github.com/testit-tms/.github/tree/main/configuration#configurationid)                                                                                                                                                                                                                                  | configurationId                   | TMS_CONFIGURATION_ID                       |
| ID of the created test run in TMS instance.<br/>It's necessary for **adapterMode** 1                                                                                                                                                                                                                                                                                                | testRunId                         | TMS_TEST_RUN_ID                            |
| Parameter for specifying the name of test run in TMS instance (**It's optional**). If it is not provided, it is created automatically                                                                                                                                                                                                                                                  | testRunName                       | TMS_TEST_RUN_NAME                          |
| Adapter mode. Default value - 1. The adapter supports following modes:<br>1 - in this mode, the adapter sends all results to the test run without filtering or [with filtering CLI](#run-with-filter)<br/>2 - in this mode, the adapter creates a new test run and sends results to the new test run | adapterMode                       | TMS_ADAPTER_MODE                           |
| It enables/disables certificate validation (**It's optional**). Default value - true                                                                                                                                                                                                                                                                                                   | certValidation                    | TMS_CERT_VALIDATION                        |
| Mode of automatic creation test cases (**It's optional**). Default value - false. The adapter supports following modes:<br/>true - in this mode, the adapter will create a test case linked to the created autotest (not to the updated autotest)<br/>false - in this mode, the adapter will not create a test case                                                                    | automaticCreationTestCases        | TMS_AUTOMATIC_CREATION_TEST_CASES          |
| Mode of automatic updation links to test cases (**It's optional**). Default value - false. The adapter supports following modes:<br/>true - in this mode, the adapter will update links to test cases<br/>false - in this mode, the adapter will not update link to test cases                                                                                                         | automaticUpdationLinksToTestCases | TMS_AUTOMATIC_UPDATION_LINKS_TO_TEST_CASES |

Add Adapter to Cypress file configuration:

```ts
import { tmsCypress } from "testit-adapter-cypress/reporter";

export default {
  e2e: {
    setupNodeEvents(on, config) {
      tmsCypress(on, config);

      return config;
    },
  },
};
```

Add Adapter to `cypress/support/e2e.js`:
```ts
import "testit-adapter-cypress";
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
  "automaticCreationTestCases": "AUTOMATIC_CREATION_TEST_CASES",
  "automaticUpdationLinksToTestCases": "AUTOMATIC_UPDATION_LINKS_TO_TEST_CASES"
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

$ npx cypress run

$ testit testrun complete
  --url https://tms.testit.software \
  --testrun-id $(cat tmp/output.txt) 
```

#### Run with filter
To create filter by autotests you can use the Test IT CLI (use adapterMode 1 for run with filter):

```
$ export TMS_TOKEN=<YOUR_TOKEN>
$ testit autotests_filter 
  --url https://tms.testit.software \
  --configuration-id 5236eb3f-7c05-46f9-a609-dc0278896464 \
  --testrun-id 6d4ac4b7-dd67-4805-b879-18da0b89d4a8 \
  --framework cypress \
  --output tmp/filter.txt

$ export TMS_TEST_RUN_ID=6d4ac4b7-dd67-4805-b879-18da0b89d4a8
$ export TMS_ADAPTER_MODE=1

$ npx cypress run --expose grep="$(cat tmp/filter.txt)"
```

#### Launch using GitLab repository
To run your Cypress test's from GitLab to TestIT or in reverse order using "testit-adapter-cypress", you can take this .gitlab-ci.yml file example:

```
image: node:latest

stages:
  - run

first-job:
  stage: run
  script:
    - npm install
    - npx cypress run
  artifacts:
    paths:
      - node_modules/
```


### Methods

Methods can be used to specify information about autotest.

Description of methods:
- `tms.addWorkItemIds` - a dynamic method that links autotests with manual tests. Receives the array of manual tests' IDs
- `tms.addDisplayName` - a dynamic method for adding internal autotest name (used in Test IT)
- `tms.addTitle` - a dynamic method for adding autotest name specified in the autotest card. If not specified, the name from the displayName method is used
- `tms.addDescription` - a dynamic method for adding autotest description specified in the autotest card
- `tms.addLabels` - a dynamic method for adding labels listed in the autotest card
- `tms.addTags` - a dynamic method for adding tags listed in the autotest card
- `tms.addLinks` - links in the autotest result
- `tms.addAttachments` - uploading files in the autotest result
- `tms.addMessage` - information about autotest in the autotest result
- `tms.addNameSpace` - a dynamic method for adding directory in the TMS system (default - file's name of test)
- `tms.addClassName` - a dynamic method for adding subdirectory in the TMS system (default - class's name of test)
- `tms.addParameter` - a dynamic method for adding parameter in the autotest result
- `tms.step` - usage in the "with" construct to designation a step in the body of the test

### Examples

#### Simple test
```js
import { getTestRuntime } from "testit-adapter-cypress/runtime";

describe('example to-do app', () => {
  it('displays two todo items by default', () => {
    const tms = getTestRuntime();

    tms.addWorkItemIds('123', '321');
    tms.addDisplayName('display name');
    tms.addTitle('test title');
    tms.addDescription('Test description');
    tms.addLabels('label1', 'label2');
    tms.addTags('tag1', 'tag2');
    tms.addLinks([
      {
        url: 'https://www.google.com',
        title: 'Google',
        description: 'This is a link to Google',
        type: 'Related',
      },
    ]);
    tms.addParameter("name", "value");
    tms.addNameSpace("namespace");
    tms.addClassName("classname");

    tms.step("step title", () => {
      // ...
    }).then((user) => {
      tms.step("inner step title", () => {
        // ...
      });
    });
  });
});
```

#### Content types
```
  TEXT = "text/plain",
  XML = "application/xml",
  HTML = "text/html",
  CSV = "text/csv",
  TSV = "text/tab-separated-values",
  CSS = "text/css",
  URI = "text/uri-list",
  SVG = "image/svg+xml",
  PNG = "image/png",
  JSON = "application/json",
  ZIP = "application/zip",
  WEBM = "video/webm",
  JPEG = "image/jpeg",
  MP4 = "video/mp4",
```

# Contributing

You can help to develop the project. Any contributions are **greatly appreciated**.

* If you have suggestions for adding or removing projects, feel free to [open an issue](https://github.com/testit-tms/adapters-js/issues/new) to discuss it, or directly create a pull request after you edit the *README.md* file with necessary changes.
* Please make sure you check your spelling and grammar.
* Create individual PR for each suggestion.
* Please also read through the [Code Of Conduct](https://github.com/testit-tms/adapters-js/blob/master/CODE_OF_CONDUCT.md) before posting your first idea as well.

# License

Distributed under the Apache-2.0 License. See [LICENSE](https://github.com/testit-tms/adapters-js/blob/master/LICENSE.md) for more information.

