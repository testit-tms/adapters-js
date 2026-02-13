# Test IT TMS adapters for Mocha
![Test IT](https://raw.githubusercontent.com/testit-tms/adapters-js/master/images/banner.png)

## Getting Started

### Installation
```
npm install testit-adapter-mocha
```

### Adapter connection

```js
// .mocharc.js

module.exports = {
  reporter: "testit-adapter-mocha",
  // ... other mocha options
}
```

## Configuration

| Description                                                                                                                                                                                                                                                                                                                                                                            | File property                     | Environment variable                       |
|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------|--------------------------------------------|
| Location of the TMS instance                                                                                                                                                                                                                                                                                                                                                           | url                               | TMS_URL                                    |
| API secret key <br/>[How to getting API secret key?](https://github.com/testit-tms/.github/tree/main/configuration#privatetoken)                                                                                                                                                                                                                                                       | privateToken                      | TMS_PRIVATE_TOKEN                          |
| ID of project in TMS instance <br/>[How to getting project ID?](https://github.com/testit-tms/.github/tree/main/configuration#projectid)                                                                                                                                                                                                                                               | projectId                         | TMS_PROJECT_ID                             |
| ID of configuration in TMS instance <br/>[How to getting configuration ID?](https://github.com/testit-tms/.github/tree/main/configuration#configurationid)                                                                                                                                                                                                                             | configurationId                   | TMS_CONFIGURATION_ID                       |
| ID of the created test run in TMS instance.<br/>It's necessary for **adapterMode** 1                                                                                                                                                                                                                                                                                                | testRunId                         | TMS_TEST_RUN_ID                            |
| Parameter for specifying the name of test run in TMS instance (**It's optional**). <br/>If it is not provided, it is created automatically                                                                                                                                                                                                                                             | testRunName                       | TMS_TEST_RUN_NAME                          |
| Adapter mode. Default value - 1. The adapter supports following modes:<br>1 - in this mode, the adapter sends all results to the test run without filtering or [with filtering CLI](#run-with-filter)<br/>2 - in this mode, the adapter creates a new test run and sends results to the new test run | adapterMode                       | TMS_ADAPTER_MODE                           |
| Mode of automatic creation test cases (**It's optional**). Default value - false. The adapter supports following modes:<br/>true - in this mode, the adapter will create a test case linked to the created autotest (not to the updated autotest)<br/>false - in this mode, the adapter will not create a test case                                                                    | automaticCreationTestCases        | TMS_AUTOMATIC_CREATION_TEST_CASES          |
| Mode of automatic updation links to test cases (**It's optional**). Default value - false. The adapter supports following modes:<br/>true - in this mode, the adapter will update links to test cases<br/>false - in this mode, the adapter will not update link to test cases                                                                                                         | automaticUpdationLinksToTestCases | TMS_AUTOMATIC_UPDATION_LINKS_TO_TEST_CASES |

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
  "automaticUpdationLinksToTestCases": false
}
```

2. You can set adapter config in mocha config file: `.mocharc.js`.

```js
module.exports = {
  reporter: "testit-adapter-mocha",
  tmsOptions: {
    url: 'URL',
    privateToken: 'USER_PRIVATE_TOKEN',
    projectId: 'PROJECT_ID',
    configurationId: 'CONFIGURATION_ID',
    testRunId: 'TEST_RUN_ID',
    adapterMode: ADAPTER_MODE,
    automaticCreationTestCases: AUTOMATIC_CREATION_TEST_CASES,
    automaticUpdationLinksToTestCases: AUTOMATIC_UPDATION_LINKS_TO_TEST_CASES,
  },
  // ... other mocha options
};
```

3. You can set adapter config to environment variables: `.env`.

```dotenv
TMS_PRIVATE_TOKEN=YourPrivateToken
TMS_URL=URL
TMS_PROJECT_ID=YourProjectId;
TMS_CONFIGURATION_ID=YourConfigurationId;
TMS_TEST_RUN_ID=TestRunId;
TMS_TEST_RUN_NAME=TestRunName; # optional
TMS_ADAPTER_MODE=1; # or 2
TMS_CONFIG_FILE=pathToAnotherConfigFile; #optional
TMS_AUTOMATIC_CREATION_TEST_CASES=false; # or true, optional
TMS_AUTOMATIC_UPDATION_LINKS_TO_TEST_CASES=false; # or true, optional
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

$ npx mocha --parallel

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
  --framework mocha \
  --output tmp/filter.txt

$ export TMS_TEST_RUN_ID=6d4ac4b7-dd67-4805-b879-18da0b89d4a8
$ export TMS_ADAPTER_MODE=1

$ npx mocha --grep $(cat tmp/filter.txt)
```

## Usage

Methods and properties can be used to specify information about autotest.

### Properties

Description of metadata properties:
- `this.workItemsIds` - a method that links autotests with manual tests. Receives the array of manual tests' IDs
- `this.displayName` - internal autotest name (used in Test IT)
- `this.externalId` - unique internal autotest ID (used in Test IT)
- `this.title` - autotest name specified in the autotest card. If not specified, the name from the displayName method is used
- `this.description` - autotest description specified in the autotest card
- `this.labels` - labels listed in the autotest card
- `this.tags` - tags listed in the autotest card
- `this.links` - links listed in the autotest card
- `this.nameSpace` - directory in the TMS system (default - directory's name of test)
- `this.className` - subdirectory in the TMS system (default - file's name of test)

### Methods

Description of methods:
- `this.addLinks` - links in the autotest result
- `this.addAttachments` - uploading files in the autotest result or step result
- `this.addMessage` - information about autotest in the autotest result
- `this.addSteps` - information about step in the autotest result

## Examples

### Simple test

```ts
// annotations.spec.ts

import assert from "assert";
import {Context, Link} from "testit-adapter-mocha";

const links: Link[] = [
  { url: "https://test01.example", title: "Example01", description: "Example01 description", type: "Issue" },
  { url: "https://test02.example", title: "Example02", description: "Example02 description", type: "BlockedBy" },
  { url: "https://test03.example", title: "Example03", description: "Example03 description", type: "Requirement" },
  { url: "https://test04.example", title: "Example04", description: "Example04 description", type: "Defect" },
  { url: "https://test05.example", title: "Example05", description: "Example05 description", type: "Repository" },
];

const paths = [
  join(__dirname, "../attachments/file.txt"),
  join(__dirname, "../attachments/image.jpg")
];

it('All annotations and methods', function (this: Context) {
  this.externalId = 'external_id';
  this.displayName = 'display_name';
  this.title = 'title';
  this.description = 'description';
  this.labels = ['label1', 'label2'];
  this.links = links;

  this.addMessage('This is a message');
  this.addLinks(links);

  this.addAttachments(paths);
  this.addAttachments('This is a custom attachment', 'custom.txt');
  this.addAttachments('Text-like attachmnet');
  
  this.addSteps("Step_name", (step) => {
    // ... step logic
    step.description = "Step Description";
    step.parameters = {
      login: "login",
      password: "password",
    };
    this.addAttachments("Attachment_from_step", "step.txt");
  })

  assert.equal(true, true);
});
```

### Parameterized test

```ts
// parameters.spec.ts

import assert from "assert";
import {Context} from "testit-adapter-mocha";

const tests = [2, 3, "string", false];

tests.forEach((value) => {
  it(`3 is ${value}`, function (this: Context) {
    this.parameters = {
      value: value.toString(),
    };
    
    assert.strictEqual(3, value);
  });
});

const tests2 = [
  { args: [1, 2], expected: 3 },
  { args: [1, 2, 3], expected: 7 },
  { args: [1, 2, 3, 4], expected: "10" },
];

tests2.forEach(({ args, expected }) => {
  it(`correctly sum ${args} to ${expected}`, function (this: Context) {
    this.parameters = {
      args: args.toString(),
      expected: expected.toString(),
    };
    
    assert.strictEqual(sum(args), expected);
  });
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

