# Test IT TMS adapters for Jest
![Test IT](https://raw.githubusercontent.com/testit-tms/adapters-js/master/images/banner.png)

## Getting Started

### Installation
```
npm install testit-adapter-jest
```

## Usage

### API client

To use adapter you need to install `testit-api-client`:
```
npm install testit-api-client
```

### Configuration

#### File

1. You need to set custom jest test environment, setup and teardown in `jest.config.js`.

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
    automaticCreationTestCases: AUTOMATIC_CREATION_TEST_CASES
  },
};
```

2. You also can extract environment configuration to external config and launch tests with `jest --config ./testit.jest.config.js`.

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
    automaticCreationTestCases: AUTOMATIC_CREATION_TEST_CASES
  },
};
```

3. Fill parameters with your configuration, where:  
    * `url` - location of the TMS instance  
      
    * `privateToken` - API secret key
        1. go to the https://{DOMAIN}/user-profile profile
        2. copy the API secret key
    
    * `projectId` - ID of project in TMS instance.
    
        1. create a project
        2. open DevTools -> network
        3. go to the project https://{DOMAIN}/projects/{PROJECT_ID}/tests
        4. GET-request project, Preview tab, copy id field  
    
    * `configurationId` - ID of configuration in TMS instance.
    
        1. create a project  
        2. open DevTools -> network  
        3. go to the project https://{DOMAIN}/projects/{PROJECT_ID}/tests  
        4. GET-request configurations, Preview tab, copy id field  
    
    * `testRunId` - id of the created test run in TMS instance. `testRunId` is optional. If it is not provided, it is created automatically.  
      
    * `testRunName` - parameter for specifying the name of test run in TMS instance. `testRunName` is optional. If it is not provided, it is created automatically.  

    * `adapterMode` - adapter mode. Default value - 0. The adapter supports following modes:
      * 0 - in this mode, the adapter filters tests by test run ID and configuration ID, and sends the results to the test run.
      * 1 - in this mode, the adapter sends all results to the test run without filtering.
      * 2 - in this mode, the adapter creates a new test run and sends results to the new test run.
    
    * `automaticCreationTestCases` - mode of automatic creation test cases. Default value - false. The adapter supports following modes:
       * true - in this mode, the adapter will create a test case linked to the created autotest (not to the updated autotest).
       * false - in this mode, the adapter will not create a test case.

#### Command line

You can also specify options via cli arguments `jest --testEnvironment testit-adapter-jest --testEnvironmentOptions "{\"url\":\"URL\",\"privateToken\":\"USER_PRIVATE_TOKEN\",\"projectId\":\"PROJECT_ID\",\"configurationId\":\"CONFIGURATION_ID\",\"testRunId\":\"TEST_RUN_ID\",\"adapterMode\":ADAPTER_MODE,\"automaticCreationTestCases\":AUTOMATIC_CREATION_TEST_CASES}" --globalSetup testit-adapter-jest/dist/globalSetup.js --globalTeardown testit-adapter-jest/dist/globalTeardown.js`


### Methods

Methods can be used to specify information about autotest.

Description of metadata methods:
- `testit.workItemIds` - linking an autotest to a test case
- `testit.displayName` - name of the autotest in the Test IT system (can be replaced with documentation strings)
- `testit.externalId` - ID of the autotest within the project in the Test IT System
- `testit.title` - title in the autotest card
- `testit.description` - description in the autotest card
- `testit.labels` - tags in the work item
- `testit.link` - links in the autotest card
- `testit.nameSpace` - directory in the TMS system (default - directory's name of test)
- `testit.className` - subdirectory in the TMS system (default - file's name of test)

Description of methods:
- `testit.addLinks` - links in the autotest result
- `testit.addAttachments` - uploading files in the autotest result
- `testit.addMessage` - information about autotest in the autotest result

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

