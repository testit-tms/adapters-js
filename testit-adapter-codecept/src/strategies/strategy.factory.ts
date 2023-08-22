import { AdapterConfig, IClient } from "testit-js-commons";
import { DefaultStrategy } from "./default.strategy";
import { PartialStrategy } from "./partial.strategy";
import { ScratchStrategy } from "./scratch.strategy";
import { Logger } from "../common/classes";
import { Strategy } from "../types";

export type AdapterMode = 0 | 1 | 2;
type StrategyConstructor = () => Strategy;

export class StrategyFactory {
  public static create(http: IClient, logger: Logger, config: AdapterConfig): Strategy {
    const strategies: Record<AdapterMode, StrategyConstructor> = {
      0: () => new PartialStrategy(http, logger, config),
      1: () => new DefaultStrategy(http, logger, config),
      2: () => new ScratchStrategy(http, logger, config),
    };

    if (!strategies[config?.adapterMode]) {
      logger.warn(`This mode ${config?.adapterMode} is invalid. Use mode 0, 1, 2`);
    }

    return strategies[config?.adapterMode ?? 0]();
  }
}
