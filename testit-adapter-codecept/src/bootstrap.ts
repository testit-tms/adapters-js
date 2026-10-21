import { container, event, recorder } from "codeceptjs";
import { ConfigComposer, StrategyFactory, logger } from "testit-js-commons";
import { ResultBuilder, TestsBuilder } from "./builders";

module.exports = async function (options) {
  const config = new ConfigComposer().compose();

  const strategy = StrategyFactory.create(config);
  const helper = container.helpers("TestITHelper");

  await strategy.setup();

  let uploadChain: Promise<void> = Promise.resolve();
  let tornDown = false;

  function enqueueTransfer(test) {
    const metadata = { ...(helper?.metadata ?? {}) };
    if (helper) {
      helper.metadata = {};
    }

    uploadChain = uploadChain
      .then(async () => {
        const autotest = TestsBuilder.build(test);
        await strategy.loadAutotest(autotest, test.state);
        const result = await new ResultBuilder(config).build(test, metadata);
        await strategy.loadTestRun([result]);
      })
      .catch((err) => {
        logger.error("Failed to transfer Codecept result to TMS", err);
      });
  }

  async function safeTeardown() {
    if (tornDown) {
      return;
    }
    tornDown = true;
    await uploadChain;
    await strategy.teardown();
  }

  event.dispatcher.on(event.test.after, (test) => {
    enqueueTransfer(test);
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
