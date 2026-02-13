# Test IT TMS adapters for Jest
![Test IT](https://raw.githubusercontent.com/testit-tms/adapters-js/master/images/banner.png)

## Getting Started

### Installation
```
npm install testit-adapter-jest
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

#### File

1. Create .env config or file config with default name tms.config.json in the root directory of the project

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

2. You need to set custom setup and teardown in `jest.config.js`. Additionally, you can set adapter config in this file

```js
module.exports = {
  testEnvironment: 'testit-adapter-jest',
  globalSetup: 'testit-adapter-jest/dist/globalSetup.js',
  globalTeardown: 'testit-adapter-jest/dist/globalTeardown.js',
  testEnvironmentOptions: {
    url: 'URL',
    privateToken: 'USER_PRIVATE_TOKEN',
    projectId: 'PROJECT_ID',
    configurationId: 'CONFIGURATION_ID',
    testRunId: 'TEST_RUN_ID',
    adapterMode: ADAPTER_MODE,
    automaticCreationTestCases: AUTOMATIC_CREATION_TEST_CASES,
    automaticUpdationLinksToTestCases: AUTOMATIC_UPDATION_LINKS_TO_TEST_CASES
  },
};
```

3. You also can extract environment configuration to external config and launch tests with `jest --config ./testit.jest.config.js`.

```js
// testit.jest.config.js
const defaultConfig = require('./jest.config');

module.exports = {
  ...defaultConfig,
  testEnvironment: 'testit-adapter-jest',
  globalSetup: 'testit-adapter-jest/dist/globalSetup.js',
  globalTeardown: 'testit-adapter-jest/dist/globalTeardown.js',
  testEnvironmentOptions: {
    url: 'URL',
    privateToken: 'USER_PRIVATE_TOKEN',
    projectId: 'PROJECT_ID',
    configurationId: 'CONFIGURATION_ID',
    testRunId: 'TEST_RUN_ID',
    adapterMode: ADAPTER_MODE,
    automaticCreationTestCases: AUTOMATIC_CREATION_TEST_CASES,
    automaticUpdationLinksToTestCases: AUTOMATIC_UPDATION_LINKS_TO_TEST_CASES
  },
};
```

#### Command line

You can also specify options via cli arguments `jest --testEnvironment testit-adapter-jest --testEnvironmentOptions "{\"url\":\"URL\",\"privateToken\":\"USER_PRIVATE_TOKEN\",\"projectId\":\"PROJECT_ID\",\"configurationId\":\"CONFIGURATION_ID\",\"testRunId\":\"TEST_RUN_ID\",\"adapterMode\":ADAPTER_MODE,\"automaticCreationTestCases\":AUTOMATIC_CREATION_TEST_CASES,\"automaticUpdationLinksToTestCases\":AUTOMATIC_UPDATION_LINKS_TO_TEST_CASES}" --globalSetup testit-adapter-jest/dist/globalSetup.js --globalTeardown testit-adapter-jest/dist/globalTeardown.js`

#### Run with filter
To create filter by autotests you can use the Test IT CLI (use adapterMode 1 for run with filter):

```
$ export TMS_TOKEN=<YOUR_TOKEN>
$ testit autotests_filter 
  --url https://tms.testit.software \
  --configuration-id 5236eb3f-7c05-46f9-a609-dc0278896464 \
  --testrun-id 6d4ac4b7-dd67-4805-b879-18da0b89d4a8 \
  --framework jest \
  --output tmp/filter.txt

$ export TMS_TEST_RUN_ID=6d4ac4b7-dd67-4805-b879-18da0b89d4a8
$ export TMS_ADAPTER_MODE=1

$ npx jest -t "$(cat tmp/filter.txt)"
```

### Methods

Methods can be used to specify information about autotest.

Description of metadata methods:
- `testit.workItemIds` - a method that links autotests with manual tests. Receives the array of manual tests' IDs
- `testit.displayName` - internal autotest name (used in Test IT)
- `testit.externalId` - unique internal autotest ID (used in Test IT)
- `testit.title` - autotest name specified in the autotest card. If not specified, the name from the displayName method is used
- `testit.description` - autotest description specified in the autotest card
- `testit.labels` - labels listed in the autotest card
- `testit.tags` - tags listed in the autotest card
- `testit.link` - links listed in the autotest card
- `testit.namespace` - directory in the TMS system (default - directory's name of test)
- `testit.classname` - subdirectory in the TMS system (default - file's name of test)

Description of methods:
- `testit.addLinks` - links in the autotest result
- `testit.addAttachments` - uploading files in the autotest result
- `testit.addMessage` - information about autotest in the autotest result
- `testit.step` - add step of autotest

### Examples

#### Simple test
```js
test('All annotations', () => {
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

  testit.addAttachments([join(__dirname, 'attachment1.txt')]);
  testit.addAttachments('This is a custom attachment', 'custom.txt');

  expect(1).toBe(1);
});
```

#### Parameterized test
```js
test.each([1, 2, 3, 4])('Primitive params', (number) => {
  testit.params(number);
  expect(number).toBe(number);
});

test.each([
  {
    a: 1,
    b: 2,
    sum: 3,
  },
  {
    a: 2,
    b: 3,
    sum: 5,
  },
  {
    a: 4,
    b: 3,
    sum: 5,
  }
])('Object params', (params) => {
  testit.params(params);
  expect(params.a + params.b).toBe(params.sum);
});
```


# Contributing

You can help to develop the project. Any contributions are **greatly appreciated**.

* If you have suggestions for adding or removing projects, feel free to [open an issue](https://github.com/testit-tms/adapters-js/issues/new) to discuss it, or directly create a pull request after you edit the *README.md* file with necessary changes.
* Please make sure you check your spelling and grammar.
* Create individual PR for each suggestion.
* Please also read through the [Code Of Conduct](https://github.com/testit-tms/adapters-js/blob/master/CODE_OF_CONDUCT.md) before posting your first idea as well.

# License

Distributed under the Apache-2.0 License. See [LICENSE](https://github.com/testit-tms/adapters-js/blob/master/LICENSE.md) for more information.

