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
| 5.4     | 3.2.8-TMS-5.4   | 3.2.8-TMS-5.4   | 3.2.8-TMS-5.4   | 3.2.8-TMS-5.4   | 3.2.8-TMS-5.4   | 3.2.8-TMS-5.4   |
| 5.5     | 3.4.3-TMS-5.5   | 3.4.3-TMS-5.5   | 3.4.3-TMS-5.5   | 3.4.3-TMS-5.5   | 3.4.3-TMS-5.5   | 3.4.3-TMS-5.5   |
| 5.6     | 3.6.0-TMS-5.6   | 3.6.0-TMS-5.6   | 3.6.0-TMS-5.6   | 3.6.0-TMS-5.6   | 3.6.0-TMS-5.6   | 3.6.0-TMS-5.6   |
| Cloud   | 3.7.0 +         | 3.7.0 +         | 3.7.0 +         | 3.7.0 +         | 3.7.0 +         | 3.7.0 +         |

1. For current versions, see the releases tab. 
2. Starting with 5.2, we have added a TMS postscript, which means that the utility is compatible with a specific enterprise version. 
3. If you are in doubt about which version to use, check with the support staff. support@yoonion.ru

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
