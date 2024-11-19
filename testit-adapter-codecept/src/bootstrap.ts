import { container, event, recorder } from "codeceptjs";
import { ConfigComposer, StrategyFactory } from "testit-js-commons";
import { ResultBuilder, TestsBuilder } from "./builders";
import { isPassed } from "./common/utils";

module.exports = async function (options) {
  const config = new ConfigComposer().compose();

  const strategy = StrategyFactory.create(config);
  const helper = container.helpers("TestITHelper");

  await strategy.setup();

  event.dispatcher.on(event.test.finished, (test) => {
    recorder.add("transferTestAndRuns", async () => {
      const autotest = TestsBuilder.build(test);

      await strategy.loadAutotest(autotest, isPassed(test));

      const result = await new ResultBuilder(config).build(test, helper.metadata);

      await strategy.loadTestRun([result]);

      helper.metadata = {};
    });
  });

  event.dispatcher.on(event.workers.after, async () => {
    await strategy.teardown();
  });
};
