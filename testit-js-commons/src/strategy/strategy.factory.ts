import { AdapterConfig, AdapterMode } from "../common";
import { IStrategy } from "./strategy.type";
import { ZeroStrategy } from "./zero.strategy";
import { FirstStrategy } from "./first.strategy";
import { SecondStrategy } from "./second.strategy";

type StrategyConstructor = () => IStrategy;

export class StrategyFactory {
  public static create(config: AdapterConfig) {
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
