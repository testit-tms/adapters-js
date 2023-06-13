import { container, event, recorder } from 'codeceptjs';
import { ConfigComposer } from './common/classes/config.class';
import { Logger } from './common/classes/logger.class';
import { DefaultHttpClient } from './http/default-http-client.class';
import { StrategyFactory } from './strategies/strategy.factory';

module.exports = async function() {
  const config = new ConfigComposer().compose();
  const logger = new Logger(config.__DEV);

  const http: DefaultHttpClient = new DefaultHttpClient(config, logger);
  const strategy = StrategyFactory.create(http, logger, config);

  const helper = container.helpers('TestITHelper');

  await strategy.bootstrap();

  event.dispatcher.on(event.test.after, (test) => {
    strategy.collect(test.id, helper.metadata);
    helper.metadata = {};
  })


  event.dispatcher.on(event.test.before, async (test) => {
    await strategy.beforeTest(test);
  })

  event.dispatcher.on(event.test.finished, async (test) => {
    recorder.add('transferTestAndRuns', async () => {
        const suite = {
          tests: [test]
        };
        await strategy.transferTestsToSystem(suite);
        await strategy.transferRunsToSystem(suite);
    });
  });

  event.dispatcher.on(event.all.after, async () => {
    await strategy.teardown();
  })

  event.dispatcher.on(event.all.after, async () => {
    await strategy.teardown();
  })
};