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
  const enqueued = new Set<object>();

  function enqueueTransfer(test) {
    const metadata = { ...(helper?.metadata ?? {}) };
    if (helper) {
      helper.metadata = {};
    }

    const state = test.state;
    const autotest = TestsBuilder.build(test);
    // Start build immediately so sync preamble snapshots steps/traces before the next test.
    const resultPromise = new ResultBuilder(config).build(test, metadata);

    uploadChain = uploadChain
      .then(async () => {
        await strategy.loadAutotest(autotest, state);
        const result = await resultPromise;
        await strategy.loadTestRun([result]);
      })
      .catch((err) => {
        logger.error("Failed to transfer Codecept result to TMS", err);
      });
  }

  function tryEnqueue(test) {
    if (enqueued.has(test)) {
      return;
    }
    enqueued.add(test);
    enqueueTransfer(test);
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
    // Prefer finished (full metadata lifecycle); fall back if finished never fires (empty Scenario).
    queueMicrotask(() => tryEnqueue(test));
  });

  event.dispatcher.on(event.test.finished, (test) => {
    tryEnqueue(test);
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
