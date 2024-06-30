# Test IT TMS adapters for Cucumber
![Test IT](https://raw.githubusercontent.com/testit-tms/adapters-js/master/images/banner.png)

## Getting Started

### Installation
```
npm install testit-adapter-cucumber
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

Create `tms.config.json` file in the root directory of the project:
```json
{
  "url": "Url",
  "privateToken": "Private_token",
  "projectId": "Project_id",
  "configurationId": "Configuration_id",
  "testRunName": "Test_run_name",
  "adapterMode": 2,
  "automaticCreationTestCases": false,
  "automaticUpdationLinksToTestCases": false
}
```

And fill object with your configuration. Formatter sends results to Test IT.

> TestRunId is optional. If it's not provided than it create automatically.

Add to `cucumber.js` file

```js
module.exports = {
  default:
    '-f testit-adapter-cucumber',
};
```

### Tags

Formatter provides additional methods to World:

- addMessage - adds message to autotest
- addLinks - adds links to autotest
- addAttachments - uploads specified to Test IT and links to test run

```js
When('Something happens', function () {
  this.addMessage('💔');
  this.addLinks([
    {
      url: 'http://github.com',
    },
    {
      url: 'https://wikipedia.org',
      title: 'Wikipedia',
      description: 'The free encyclopedia',
      type: 'Related',
      hasInfo: true,
    },
  ]);
  this.addAttachments(['path/to/file.txt']);
});
```

Cucumber tags can be used to specify information about autotest.

> Only those specified above the `Scenario` are taken into account

- `@ExternalId` - unique internal autotest ID (used in Test IT)
- `@Title` - autotest name specified in the autotest card. If not specified, the name from the displayName method is used
- `@DisplayName` - internal autotest name (used in Test IT)
- `@Description` - autotest description specified in the autotest card
- `@Links` - links listed in the autotest card (`@Link={"url":"http://google.com","hasInfo":true,"description":"GoogleDescription","title":"Google","type":"Defect"}`) or in text (`@Link=http://google.com`)
- `@Labels` - tags listed in the autotest card
- `@WorkItemIds` - a method that links autotests with manual tests. Receives the array of manual tests' IDs
- `@NameSpace` - directory in the TMS system
- `@ClassName` - subdirectory in the TMS system

### Examples

#### Tags
```
Feature: Tags
  @DisplayName=GoogiliGoogle
  @Description=Cannot_Write_With_Spaces
  @ExternalId=344
  @Links=http://google.com
  @Links=http://vk.com
  @Labels=Maths
  @Labels=School
  Scenario: Scenario with links
    When 2+2
    Then Result is 4
  @Title=LINKS
  @ExternalId=343
  @Links={"url":"http://google.com","hasInfo":true,"description":"GoogleDescription","title":"Google","type":"Defect"}
  Scenario: Scenario with link obj
    When 2+2
    Then Result is 4
```

#### Parameterized test
```
Feature: Rule
  Tests that use Rule
  @ExternalId=999
  Scenario: Summing
    When <left>+<right>
    Then Result is <result>

    Examples: Options
      Examples show different options
      | left | right | result |
      | 1    | 1     | 3      |
      | 9    | 9     | 18     |
```

# Contributing

You can help to develop the project. Any contributions are **greatly appreciated**.

* If you have suggestions for adding or removing projects, feel free to [open an issue](https://github.com/testit-tms/adapters-js/issues/new) to discuss it, or directly create a pull request after you edit the *README.md* file with necessary changes.
* Please make sure you check your spelling and grammar.
* Create individual PR for each suggestion.
* Please also read through the [Code Of Conduct](https://github.com/testit-tms/adapters-js/blob/master/CODE_OF_CONDUCT.md) before posting your first idea as well.

# License

Distributed under the Apache-2.0 License. See [LICENSE](https://github.com/testit-tms/adapters-js/blob/master/LICENSE.md) for more information.

