import { AdapterConfig, AdapterMode } from "../common";
import { ZeroStrategy } from "./zero.strategy";
import { FirstStrategy } from "./first.strategy";
import { SecondStrategy } from "./second.strategy";
import {BaseStrategy} from "./base.strategy";

type StrategyConstructor = () => BaseStrategy;

export class StrategyFactory {
  public static create(config: AdapterConfig): BaseStrategy {
    const strategies: Record<AdapterMode, StrategyConstructor> = {
      0: () => new ZeroStrategy(config),
      1: () => new FirstStrategy(config),
      2: () => new SecondStrategy(config),
    };

    if (config.adapterMode !== undefined && (config.adapterMode > 2 || config.adapterMode < 0)) {
      throw new Error("Unknown adapter mode. Use mode 0, 1 or 2!");
    }

    return strategies[config.adapterMode ?? 0]();
  }
}
