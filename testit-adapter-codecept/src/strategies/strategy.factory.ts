import { Logger } from '../common/classes/logger.class';
import { DefaultHttpClient } from '../http/default-http-client.class';
import { Strategy } from '../types/strategy.type';
import { Origin } from '../types/origin.type';
import { DefaultStrategy } from './default-strategy.class';
import { PartialStrategy } from './partial-startegy.class';
import { ScratchStrategy } from './scratch-strategy.class';

export type AdapterMode = 0 | 1 | 2;
type StrategyConstructor = () => Strategy;

export class StrategyFactory {
  public static create(
    http: DefaultHttpClient,
    logger: Logger,
    config: Origin.Config
  ): Strategy {
    const strategies: Record<AdapterMode, StrategyConstructor> = {
      0: () => new PartialStrategy(http, logger, config),
      1: () => new DefaultStrategy(http, logger, config),
      2: () => new ScratchStrategy(http, logger, config)
    };

    if (!strategies[config?.adapterMode]) {
      logger.warn(`This mode ${config?.adapterMode} is invalid. Use mode 0, 1, 2`)
    }

    return strategies[config?.adapterMode ?? 0]();
  }
}