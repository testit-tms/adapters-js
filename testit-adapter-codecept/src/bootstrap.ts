import { container, event, recorder } from "codeceptjs";
import { ConfigComposer, StrategyFactory } from "testit-js-commons";
import { ResultBuilder, TestsBuilder } from "./builders";

module.exports = async function () {
  const config = new ConfigComposer().compose();

  const strategy = StrategyFactory.create(config);
  const helper = container.helpers("TestITHelper");

  // Register listeners before setup: early tests finish during TMS/sync-storage init
  // and would otherwise be lost (flaky 30/33). Handlers await this promise first.
  const setupPromise = strategy.setup();

  let finalized = false;
  const finalize = async () => {
    if (finalized) {
      return;
    }
    finalized = true;
    await setupPromise;
    await strategy.teardown();
  };

  event.dispatcher.on(event.test.finished, (test) => {
    recorder.add("transferTestAndRuns", async () => {
      await setupPromise;

      // Keep sync-storage LastStatus fresh; otherwise Force Work X fires after ~60s of in_progress.
      await strategy.touchWorker();

      const autotest = TestsBuilder.build(test);

      await strategy.loadAutotest(autotest, test.state);

      const result = await new ResultBuilder(config).build(test, helper.metadata);

      await strategy.loadTestRun([result]);

      helper.metadata = {};
    });
  });

  // Single-process `codeceptjs run` — workers.after never fires.
  event.dispatcher.on(event.all.result, () => {
    if (process.env.RUNS_WITH_WORKERS) {
      return;
    }
    recorder.add("testitTeardown", async () => {
      await finalize();
    });
  });

  // Parallel `codeceptjs run-workers`.
  event.dispatcher.on(event.workers.result, async () => {
    await finalize();
  });
  event.dispatcher.on(event.workers.after, async () => {
    await finalize();
  });

  await setupPromise;
};
