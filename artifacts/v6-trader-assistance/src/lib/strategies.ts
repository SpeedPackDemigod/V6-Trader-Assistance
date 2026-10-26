import { getAccountStorageKey } from "./account-storage";

export const STRATEGY_STORAGE_KEY = "v6-trader-assistance:strategies:v1";

export const FUTURES_SYMBOLS = ["NQ", "MNQ", "YM", "MYM"] as const;

export type FuturesSymbol = (typeof FUTURES_SYMBOLS)[number];
export type EntryRule = "breakout" | "bounce";
export type TradeDirection = "both" | "long" | "short";

export type StrategyConfig = {
  name: string;
  symbol: FuturesSymbol;
  entryRule: EntryRule;
  direction: TradeDirection;
  supportPrice: number;
  resistancePrice: number;
  stopLossPoints: number;
  takeProfitPoints: number;
};

export type StrategyVersion = {
  version: number;
  savedAt: string;
  config: StrategyConfig;
};

export type SavedStrategy = {
  id: string;
  createdAt: string;
  isExample?: boolean;
  versions: StrategyVersion[];
};

export type StrategyStorageRead = {
  strategies: SavedStrategy[];
  notice: string;
};

const starterStrategy: SavedStrategy = {
  id: "starter-sr-breakout",
  createdAt: "2026-01-01T00:00:00.000Z",
  isExample: true,
  versions: [
    {
      version: 1,
      savedAt: "2026-01-01T00:00:00.000Z",
      config: {
        name: "S&R Breakout Starter",
        symbol: "NQ",
        entryRule: "breakout",
        direction: "both",
        supportPrice: 21500,
        resistancePrice: 21580,
        stopLossPoints: 16,
        takeProfitPoints: 32,
      },
    },
  ],
};

function isFuturesSymbol(value: unknown): value is FuturesSymbol {
  return FUTURES_SYMBOLS.includes(value as FuturesSymbol);
}

function isStrategyConfig(value: unknown): value is StrategyConfig {
  if (!value || typeof value !== "object") return false;
  const config = value as Record<string, unknown>;
  return (
    typeof config.name === "string" &&
    config.name.trim().length > 0 &&
    isFuturesSymbol(config.symbol) &&
    (config.entryRule === "breakout" || config.entryRule === "bounce") &&
    (config.direction === "both" ||
      config.direction === "long" ||
      config.direction === "short") &&
    typeof config.supportPrice === "number" &&
    Number.isFinite(config.supportPrice) &&
    typeof config.resistancePrice === "number" &&
    Number.isFinite(config.resistancePrice) &&
    config.supportPrice < config.resistancePrice &&
    typeof config.stopLossPoints === "number" &&
    Number.isFinite(config.stopLossPoints) &&
    config.stopLossPoints > 0 &&
    typeof config.takeProfitPoints === "number" &&
    Number.isFinite(config.takeProfitPoints) &&
    config.takeProfitPoints > 0
  );
}

function isSavedStrategy(value: unknown): value is SavedStrategy {
  if (!value || typeof value !== "object") return false;
  const strategy = value as Record<string, unknown>;
  if (
    typeof strategy.id !== "string" ||
    !strategy.id ||
    typeof strategy.createdAt !== "string" ||
    !Array.isArray(strategy.versions) ||
    strategy.versions.length === 0
  ) {
    return false;
  }

  return strategy.versions.every((version, index) => {
    if (!version || typeof version !== "object") return false;
    const savedVersion = version as Record<string, unknown>;
    return (
      savedVersion.version === index + 1 &&
      typeof savedVersion.savedAt === "string" &&
      isStrategyConfig(savedVersion.config)
    );
  });
}

function copyStarterStrategy(): SavedStrategy {
  return {
    ...starterStrategy,
    versions: starterStrategy.versions.map((version) => ({
      ...version,
      config: { ...version.config },
    })),
  };
}

export function readStoredStrategies(userId: string): StrategyStorageRead {
  if (typeof window === "undefined") {
    return { strategies: [copyStarterStrategy()], notice: "" };
  }

  try {
    const raw = window.localStorage.getItem(
      getAccountStorageKey(STRATEGY_STORAGE_KEY, userId),
    );
    if (raw === null) {
      return { strategies: [copyStarterStrategy()], notice: "" };
    }

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return {
        strategies: [copyStarterStrategy()],
        notice:
          "Saved strategies could not be read. The starter example is still available.",
      };
    }

    const validStrategies = parsed.filter(isSavedStrategy);
    const skipped = parsed.length - validStrategies.length;
    return {
      strategies: validStrategies,
      notice: skipped
        ? `${skipped} saved ${skipped === 1 ? "strategy was" : "strategies were"} skipped because the data was incomplete.`
        : "",
    };
  } catch {
    return {
      strategies: [copyStarterStrategy()],
      notice:
        "Saved strategies could not be read from this browser. The starter example is still available.",
    };
  }
}

export function persistStrategies(
  strategies: SavedStrategy[],
  userId: string,
): string | null {
  try {
    window.localStorage.setItem(
      getAccountStorageKey(STRATEGY_STORAGE_KEY, userId),
      JSON.stringify(strategies),
    );
    return null;
  } catch {
    return "This browser could not save the strategy. It will remain available until you leave this page.";
  }
}

export function getCurrentStrategyVersion(
  strategy: SavedStrategy,
): StrategyVersion {
  return strategy.versions[strategy.versions.length - 1];
}

export function createStrategy(
  config: StrategyConfig,
  now = new Date().toISOString(),
): SavedStrategy {
  return {
    id: `strategy-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
    versions: [{ version: 1, savedAt: now, config: { ...config } }],
  };
}

export function addStrategyVersion(
  strategy: SavedStrategy,
  config: StrategyConfig,
  now = new Date().toISOString(),
): SavedStrategy {
  return {
    ...strategy,
    isExample: false,
    versions: [
      ...strategy.versions,
      {
        version: strategy.versions.length + 1,
        savedAt: now,
        config: { ...config },
      },
    ],
  };
}
