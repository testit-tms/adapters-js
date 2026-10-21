import { container, event, recorder } from "codeceptjs";
import { ConfigComposer, StrategyFactory, logger } from "testit-js-commons";
import { ResultBuilder, TestsBuilder } from "./builders";

module.exports = async function (options) {
  const config = new ConfigComposer().compose();

  const strategy = StrategyFactory.create(config);
  const helper = container.helpers("TestITHelper");

  await strategy.setup();

  let tornDown = false;
  async function safeTeardown() {
    if (tornDown) {
      return;
    }
    tornDown = true;
    await strategy.teardown();
  }

  event.dispatcher.on(event.test.after, (test) => {
    recorder.startUnlessRunning();
    recorder.add("transferTestAndRuns", async () => {
      try {
        const autotest = TestsBuilder.build(test);

        await strategy.loadAutotest(autotest, test.state);

        const metadata = helper?.metadata ?? {};
        const result = await new ResultBuilder(config).build(test, metadata);

        await strategy.loadTestRun([result]);

        if (helper) {
          helper.metadata = {};
        }
      } catch (err) {
        logger.error("Failed to transfer Codecept result to TMS", err);
      }
    });
  });

  event.dispatcher.on(event.workers.after, async () => {
    await safeTeardown().catch((err) => logger.error("Codecept strategy teardown failed", err));
  });

  event.dispatcher.on(event.all.after, () => {
    recorder.startUnlessRunning();
    recorder.add("tmsTeardown", async () => {
      await safeTeardown().catch((err) => logger.error("Codecept strategy teardown failed", err));
    });
  });
};
