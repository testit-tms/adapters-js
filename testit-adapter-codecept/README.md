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

1. Create .env config or file config with default name testit-adapter.config.json in the root directory of the project

```json
{
  "url": "<url>",
  "privateToken": "<token>",
  "projectId": "<id>",
  "configurationId": "<id>",
  "testRunId": "<id>",
  "testRunName": "<optional name>",
  "adapterMode": <optional>,
  "automaticCreationTestCases": <optional boolean>
}
```

2. Fill parameters with your configuration, where:  
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

