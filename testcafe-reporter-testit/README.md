# Test IT TMS adapters for TestCafe
![Test IT](https://raw.githubusercontent.com/testit-tms/adapters-js/master/images/banner.png)

## Getting Started

### Installation
```
npm install testcafe-reporter-testit
```

## Configuration

| Description                                                                                                                                                | File property              | Environment variable              |
|------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------------|-----------------------------------|
| Location of the TMS instance                                                                                                                               | url                        | TMS_URL                           |
| API secret key <br/>[How to getting API secret key?](https://github.com/testit-tms/.github/tree/main/configuration#privatetoken)                           | privateToken               | TMS_PRIVATE_TOKEN                 |
| ID of project in TMS instance <br/>[How to getting project ID?](https://github.com/testit-tms/.github/tree/main/configuration#projectid)                   | projectId                  | TMS_PROJECT_ID                    |
| ID of configuration in TMS instance <br/>[How to getting configuration ID?](https://github.com/testit-tms/.github/tree/main/configuration#configurationid) | configurationId            | TMS_CONFIGURATION_ID              |
| ID of the created test run in TMS instance.<br/>It's necessary for **adapterMode** 0 or 1                                                                  | testRunId                  | TMS_TEST_RUN_ID                   |
| Parameter for specifying the name of test run in TMS instance (**It's optional**). <br/>If it is not provided, it is created automatically                 | testRunName                | TMS_TEST_RUN_NAME                 |
| Adapter mode *                                                                                                                                             | adapterMode                | TMS_ADAPTER_MODE                  |
| Mode of automatic creation test cases ** (**It's optional**).                                                                                              | automaticCreationTestCases | TMS_AUTOMATIC_CREATION_TEST_CASES |

*The adapter supports following modes:
* 0 - in this mode, the adapter filters tests by external id and sends the results to the test run. **Default value**.
* 1 - in this mode, the adapter sends all results to the test run without filtering
* 2 - in this mode, the adapter creates a new test run and sends results to the new test run

**The adapter supports following modes:
* true - in this mode, the adapter will create a test case linked to the created autotest (not to the updated autotest)
* false - in this mode, the adapter will not create a test case. **Default value**.

### File

1. Adapter configuration file: `tms.config.json`

```json
{
  "url": "URL",
  "privateToken": "USER_PRIVATE_TOKEN",
  "projectId": "PROJECT_ID",
  "configurationId": "CONFIGURATION_ID",
  "testRunId": "TEST_RUN_ID",
  "adapterMode": 0,
  "automaticCreationTestCases": false
}
```

2. You can set adapter config to environment variables: `.env`.

```dotenv
TMS_PRIVATE_TOKEN=YourPrivateToken
TMS_URL=URL
TMS_PROJECT_ID=YourProjectId;
TMS_CONFIGURATION_ID=YourConfigurationId;
TMS_TEST_RUN_ID=TestRunId;
TMS_TEST_RUN_NAME=TestRunName; # optional
TMS_ADAPTER_MODE=0; # or 1, or 2
TMS_CONFIG_FILE=pathToAnotherConfigFile; #optional
TMS_AUTOMATIC_CREATION_TEST_CASES=false; # or true, optional
```

### Parallel run
To create and complete TestRun you can use the Test IT CLI (use adapterMode 1 for parallel run):

```
$ export TMS_TOKEN=<YOUR_TOKEN>
$ testit testrun create
  --url https://tms.testit.software \
  --project-id 5236eb3f-7c05-46f9-a609-dc0278896464 \
  --testrun-name "New test run" \
  --output tmp/output.txt

$ export TMS_TEST_RUN_ID=$(cat tmp/output.txt)

$ npx testcafe chrome tests/test.spec.ts -r testit

$ testit testrun complete
  --url https://tms.testit.software \
  --testrun-id $(cat tmp/output.txt)
```

## Usage

Methods and properties can be used to specify information about autotest.

### Properties

Description of metadata properties:
- `workItemsIds` - a method that links autotests with manual tests. Receives the array of manual tests' IDs
- `displayName` - internal autotest name (used in Test IT)
- `externalId` - unique internal autotest ID (used in Test IT)
- `title` - autotest name specified in the autotest card. If not specified, the name from the displayName method is used
- `description` - autotest description specified in the autotest card
- `labels` - tags listed in the autotest card
- `links` - links listed in the autotest card
- `nameSpace` - directory in the TMS system (default - directory's name of test)
- `className` - subdirectory in the TMS system (default - file's name of test)

### Methods

Description of methods:
- `adapter.addLinks` - links in the autotest result
- `adapter.addAttachments` - uploading files in the autotest result or step result
- `adapter.addMessage` - information about autotest in the autotest result

## Examples

### Simple test

```ts
// annotations.spec.ts
const adapter = require('testcafe-reporter-testit')();
import { Selector } from 'testcafe';
import { Link } from 'testit-js-commons';
import { join } from "path";

fixture('TestCafé Example Fixture - Documentation').page('http://devexpress.github.io/testcafe/example');

const links: Link[] = [
    { url: "https://test01.example", title: "Example01", description: "Example01 description", type: "Issue" },
    { url: "https://test02.example", title: "Example02", description: "Example02 description", type: "Issue" },
];

const paths = [
  join(__dirname, "../attachments/file.txt"),
  join(__dirname, "../attachments/image.jpg")
];

test.meta({
  externalId: 'externalId',
  displayName: 'displayName',
  description: 'description',
  title: 'title',
  namespace: 'namespace',
  classname: 'classname',
  workItemIds: ['123', '321'],
  labels: ['label1', 'label2'],
})('test', async t => {
  testit.addMessage(t, "Message");
  testit.addAttachments(t, paths);
  testit.addLinks(t, links);
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

