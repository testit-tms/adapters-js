# Test IT JavaScript Integrations
The repository contains new versions of adapters for JS test frameworks.

## Compatibility

| Test IT | Codecept        | Cucumber        | Jest            | Mocha           | Playwright      | TestCafe        |
|---------|-----------------|-----------------|-----------------|-----------------|-----------------|-----------------|
| 3.5     | -               | 1.0             | -               | -               | -               | -               |
| 4.0     | 1.1             | 1.1             | 1.1             | 1.1             | 2.0             | -               |
| 4.5     | 2.1             | 2.1             | 2.1             | 2.1             | 2.1             | -               |
| 5.0     | 2.2             | 2.2             | 2.2             | 2.2             | 2.2             | 2.2             |
| 5.2     | 2.3             | 2.3             | 2.3             | 2.3             | 2.3             | 2.3             |
| 5.3     | 3.2.1-TMS-5.3   | 3.2.1-TMS-5.3   | 3.2.1-TMS-5.3   | 3.2.1-TMS-5.3   | 3.2.1-TMS-5.3   | 3.2.1-TMS-5.3   |
| 5.4     | 3.2.7-TMS-5.4   | 3.2.7-TMS-5.4   | 3.2.7-TMS-5.4   | 3.2.7-TMS-5.4   | 3.2.7-TMS-5.4   | 3.2.7-TMS-5.4   |
| Cloud   | 3.2.0-TMS-CLOUD | 3.2.0-TMS-CLOUD | 3.2.0-TMS-CLOUD | 3.2.0-TMS-CLOUD | 3.2.0-TMS-CLOUD | 3.2.0-TMS-CLOUD |

Supported test frameworks :
 1. [Cucumber](https://github.com/testit-tms/adapters-js/tree/main/testit-adapter-cucumber)
 2. [Jest](https://github.com/testit-tms/adapters-js/tree/main/testit-adapter-jest)
 3. [Codecept](https://github.com/testit-tms/adapters-js/tree/main/testit-adapter-codecept)
 4. [Mocha](https://github.com/testit-tms/adapters-js/tree/main/testit-adapter-mocha)
 4. [Playwright](https://github.com/testit-tms/adapters-js/tree/main/testit-adapter-playwright)
 5. [TestCafe](https://github.com/testit-tms/adapters-js/tree/main/testcafe-reporter-testit)

# 🚀 Warning
Since 3.0.0 version for Cucumber:
- If the externalId annotation is not specified, then its contents will be a hash of the Scenario name.
