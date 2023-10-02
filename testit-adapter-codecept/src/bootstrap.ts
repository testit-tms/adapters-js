import { container, event, recorder } from "codeceptjs";
import { Client, ConfigComposer } from "testit-js-commons";
import { Logger } from "./common/classes";
import { StrategyFactory } from "./strategies";

module.exports = async function (options) {
  const config = new ConfigComposer().compose();
  const client = new Client(config);
  const logger = new Logger(options.__DEV ?? false);

  const strategy = StrategyFactory.create(client, logger, config);
  const helper = container.helpers("TestITHelper");

  await strategy.bootstrap();

  event.dispatcher.on(event.test.after, (test) => {
    strategy.collect(test.id, helper.metadata);
    helper.metadata = {};
  });

  event.dispatcher.on(event.test.before, async (test) => {
    await strategy.beforeTest(test);
  });

  event.dispatcher.on(event.test.finished, (test) => {
    recorder.add("transferTestAndRuns", async () => {
      const suite = { tests: [test] };
      await strategy.transferTestsToSystem(suite);
      await strategy.transferRunsToSystem(suite);
    });
  });

  event.dispatcher.on(event.all.after, async () => {
    await strategy.teardown();
  });
};
