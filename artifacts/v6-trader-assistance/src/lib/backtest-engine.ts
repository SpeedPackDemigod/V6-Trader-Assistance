import {
  FUTURES_SYMBOLS,
  type FuturesSymbol,
  type StrategyConfig,
} from "./strategies";

export const TIMEFRAMES = [
  "1m",
  "5m",
  "15m",
  "30m",
  "1h",
  "4h",
  "daily",
  "weekly",
] as const;

export type Timeframe = (typeof TIMEFRAMES)[number];
export type TradeSide = "Long" | "Short";
export type ContractRollPolicy =
  | "front-month"
  | "continuous-adjusted"
  | "continuous-unadjusted"
  | "provider-defined";

export type Candle = {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type InstrumentMetadata = {
  symbol: FuturesSymbol;
  family: "Nasdaq" | "Dow";
  tickSize: number;
  pointValue: number;
  syntheticBasePrice: number;
};

export const instrumentMetadata: Record<FuturesSymbol, InstrumentMetadata> = {
  NQ: {
    symbol: "NQ",
    family: "Nasdaq",
    tickSize: 0.25,
    pointValue: 20,
    syntheticBasePrice: 21540,
  },
  MNQ: {
    symbol: "MNQ",
    family: "Nasdaq",
    tickSize: 0.25,
    pointValue: 2,
    syntheticBasePrice: 21540,
  },
  YM: {
    symbol: "YM",
    family: "Dow",
    tickSize: 1,
    pointValue: 5,
    syntheticBasePrice: 43280,
  },
  MYM: {
    symbol: "MYM",
    family: "Dow",
    tickSize: 1,
    pointValue: 0.5,
    syntheticBasePrice: 43280,
  },
};

const timeframeMilliseconds: Record<Timeframe, number> = {
  "1m": 60_000,
  "5m": 5 * 60_000,
  "15m": 15 * 60_000,
  "30m": 30 * 60_000,
  "1h": 60 * 60_000,
  "4h": 4 * 60 * 60_000,
  daily: 24 * 60 * 60_000,
  weekly: 7 * 24 * 60 * 60_000,
};

export type CandleRequest = {
  symbol: FuturesSymbol;
  timeframe: Timeframe;
  startDate: string;
  endDate: string;
  timezone?: string;
  rollPolicy?: ContractRollPolicy;
};

export type MissingDataInterval = {
  start: number;
  end: number;
};

export type ContractRollEvent = {
  timestamp: number;
  fromContract: string;
  toContract: string;
  priceAdjustment: number | null;
};

export type MarketDataCoverage = {
  requestedStart: number;
  requestedEnd: number;
  returnedStart: number | null;
  returnedEnd: number | null;
  requestedTimezone: string;
  timestampTimezone: "UTC";
  rollPolicy: ContractRollPolicy;
  missingIntervals: MissingDataInterval[];
  contractRolls: ContractRollEvent[];
  limitations: string[];
  wasSampled: boolean;
};

export type MarketDataResponse = {
  candles: Candle[];
  coverage: MarketDataCoverage;
};

export interface MarketDataProvider {
  readonly id: string;
  readonly label: string;
  getCandles(request: CandleRequest): MarketDataResponse;
}

export type BacktestSettings = CandleRequest & {
  startingBalance: number;
  contractQuantity: number;
  commissionPerContractPerSide: number;
  slippageTicks: number;
  stopLossPoints: number;
  takeProfitPoints: number;
};

export type BacktestTrade = {
  id: number;
  side: TradeSide;
  entryTime: number;
  exitTime: number;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  grossPnl: number;
  fees: number;
  netPnl: number;
  exitReason: "Stop loss" | "Take profit" | "End of test";
};

export type EquityPoint = {
  timestamp: number;
  equity: number;
};

export type BacktestResult = {
  providerLabel: string;
  candleCount: number;
  dataCoverage: MarketDataCoverage;
  dataWarnings: string[];
  startingBalance: number;
  endingBalance: number;
  totalPnl: number;
  winRate: number | null;
  profitFactor: number | null;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  trades: BacktestTrade[];
  equityCurve: EquityPoint[];
  assumptions: string;
};

type Position = {
  side: TradeSide;
  entryTime: number;
  entryPrice: number;
  stopPrice: number;
  targetPrice: number;
};

function createSeed(value: string): number {
  let seed = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    seed ^= value.charCodeAt(index);
    seed = Math.imul(seed, 16777619);
  }
  return seed >>> 0;
}

function createRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function roundToTick(price: number, tickSize: number): number {
  return Math.round(price / tickSize) * tickSize;
}

function parseWindow(startDate: string, endDate: string) {
  const start = Date.parse(`${startDate}T00:00:00.000Z`);
  const end = Date.parse(`${endDate}T23:59:59.999Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) {
    throw new RangeError("Choose a valid date range with the start before the end.");
  }
  return { start, end };
}

export const syntheticMarketDataProvider: MarketDataProvider = {
  id: "synthetic-demo",
  label: "Synthetic demo candles",
  getCandles(request) {
    if (!FUTURES_SYMBOLS.includes(request.symbol)) {
      throw new RangeError("Choose one of the supported futures symbols.");
    }
    if (!TIMEFRAMES.includes(request.timeframe)) {
      throw new RangeError("Choose one of the supported timeframes.");
    }

    const { start, end } = parseWindow(request.startDate, request.endDate);
    const range = Math.max(1, end - start);
    const interval = timeframeMilliseconds[request.timeframe];
    const requestedCount = Math.max(2, Math.floor(range / interval) + 1);
    const count = Math.min(360, requestedCount);
    const instrument = instrumentMetadata[request.symbol];
    const random = createRandom(
      createSeed(
        `${request.symbol}:${request.timeframe}:${request.startDate}:${request.endDate}`,
      ),
    );
    const candles: Candle[] = [];
    let previousClose = instrument.syntheticBasePrice;

    for (let index = 0; index < count; index += 1) {
      const progress = count === 1 ? 0 : index / (count - 1);
      const timestamp = Math.round(start + progress * range);
      const cycle =
        Math.sin(index * 0.21) * 38 +
        Math.sin(index * 0.67) * 16 +
        Math.sin(index * 0.045) * 28;
      const close = roundToTick(
        instrument.syntheticBasePrice + cycle + (random() - 0.5) * 15,
        instrument.tickSize,
      );
      const open = roundToTick(
        index === 0 ? close - (random() - 0.5) * 8 : previousClose,
        instrument.tickSize,
      );
      const wickUp = roundToTick(random() * 12, instrument.tickSize);
      const wickDown = roundToTick(random() * 12, instrument.tickSize);
      const high = roundToTick(
        Math.max(open, close) + wickUp,
        instrument.tickSize,
      );
      const low = roundToTick(
        Math.min(open, close) - wickDown,
        instrument.tickSize,
      );

      candles.push({
        timestamp,
        open,
        high,
        low,
        close,
        volume: Math.round(300 + random() * 4_700),
      });
      previousClose = close;
    }

    return {
      candles,
      coverage: {
        requestedStart: start,
        requestedEnd: end,
        returnedStart: candles[0]?.timestamp ?? null,
        returnedEnd: candles[candles.length - 1]?.timestamp ?? null,
        requestedTimezone: request.timezone ?? "UTC",
        timestampTimezone: "UTC",
        rollPolicy: request.rollPolicy ?? "provider-defined",
        missingIntervals: [],
        contractRolls: [],
        limitations: [
          "Generated synthetic candles are not historical exchange data.",
          "No individual futures expiry or contract-roll adjustment is modeled.",
          ...(requestedCount > count
            ? [
                `The ${count}-candle limit sampled the selected window; bars are spaced across the range and do not represent every ${request.timeframe} interval.`,
              ]
            : []),
        ],
        wasSampled: requestedCount > count,
      },
    };
  },
};

function validateSettings(settings: BacktestSettings) {
  parseWindow(settings.startDate, settings.endDate);
  if (!FUTURES_SYMBOLS.includes(settings.symbol)) {
    throw new RangeError("Choose one of the supported futures symbols.");
  }
  if (!TIMEFRAMES.includes(settings.timeframe)) {
    throw new RangeError("Choose one of the supported timeframes.");
  }
  if (!Number.isFinite(settings.startingBalance) || settings.startingBalance <= 0) {
    throw new RangeError("Starting balance must be greater than zero.");
  }
  if (
    !Number.isSafeInteger(settings.contractQuantity) ||
    settings.contractQuantity < 1
  ) {
    throw new RangeError("Contract quantity must be a whole number of at least one.");
  }
  if (
    !Number.isFinite(settings.commissionPerContractPerSide) ||
    settings.commissionPerContractPerSide < 0
  ) {
    throw new RangeError("Commission cannot be negative.");
  }
  if (!Number.isFinite(settings.slippageTicks) || settings.slippageTicks < 0) {
    throw new RangeError("Slippage cannot be negative.");
  }
  if (!Number.isFinite(settings.stopLossPoints) || settings.stopLossPoints <= 0) {
    throw new RangeError("Stop loss must be greater than zero.");
  }
  if (
    !Number.isFinite(settings.takeProfitPoints) ||
    settings.takeProfitPoints <= 0
  ) {
    throw new RangeError("Take profit must be greater than zero.");
  }
}

function getSignal(
  previous: Candle,
  current: Candle,
  strategy: StrategyConfig,
): TradeSide | null {
  let longSignal = false;
  let shortSignal = false;

  if (strategy.entryRule === "breakout") {
    longSignal =
      previous.close <= strategy.resistancePrice &&
      current.close > strategy.resistancePrice;
    shortSignal =
      previous.close >= strategy.supportPrice &&
      current.close < strategy.supportPrice;
  } else {
    longSignal =
      current.low <= strategy.supportPrice &&
      current.close > strategy.supportPrice;
    shortSignal =
      current.high >= strategy.resistancePrice &&
      current.close < strategy.resistancePrice;
  }

  if (longSignal === shortSignal) return null;
  if (longSignal && strategy.direction !== "short") return "Long";
  if (shortSignal && strategy.direction !== "long") return "Short";
  return null;
}

function closeTrade(
  position: Position,
  exitPrice: number,
  exitTime: number,
  exitReason: BacktestTrade["exitReason"],
  settings: BacktestSettings,
  tradeId: number,
): BacktestTrade {
  const instrument = instrumentMetadata[settings.symbol];
  const points =
    position.side === "Long"
      ? exitPrice - position.entryPrice
      : position.entryPrice - exitPrice;
  const grossPnl =
    points * instrument.pointValue * settings.contractQuantity;
  const fees =
    settings.commissionPerContractPerSide *
    settings.contractQuantity *
    2;
  return {
    id: tradeId,
    side: position.side,
    entryTime: position.entryTime,
    exitTime,
    entryPrice: position.entryPrice,
    exitPrice,
    quantity: settings.contractQuantity,
    grossPnl,
    fees,
    netPnl: grossPnl - fees,
    exitReason,
  };
}

function resolveBracketExit(
  position: Position,
  candle: Candle,
  slippage: number,
  tickSize: number,
): { price: number; reason: BacktestTrade["exitReason"] } | null {
  if (position.side === "Long") {
    const stopHit = candle.low <= position.stopPrice;
    const targetHit = candle.high >= position.targetPrice;
    if (stopHit) {
      const price =
        candle.open <= position.stopPrice
          ? candle.open - slippage
          : position.stopPrice - slippage;
      return {
        price: roundToTick(price, tickSize),
        reason: "Stop loss",
      };
    }
    if (targetHit) {
      const price =
        candle.open >= position.targetPrice
          ? candle.open - slippage
          : position.targetPrice - slippage;
      return {
        price: roundToTick(price, tickSize),
        reason: "Take profit",
      };
    }
  } else {
    const stopHit = candle.high >= position.stopPrice;
    const targetHit = candle.low <= position.targetPrice;
    if (stopHit) {
      const price =
        candle.open >= position.stopPrice
          ? candle.open + slippage
          : position.stopPrice + slippage;
      return {
        price: roundToTick(price, tickSize),
        reason: "Stop loss",
      };
    }
    if (targetHit) {
      const price =
        candle.open <= position.targetPrice
          ? candle.open + slippage
          : position.targetPrice + slippage;
      return {
        price: roundToTick(price, tickSize),
        reason: "Take profit",
      };
    }
  }
  return null;
}

export function runBacktest(
  strategy: StrategyConfig,
  settings: BacktestSettings,
  provider: MarketDataProvider = syntheticMarketDataProvider,
): BacktestResult {
  validateSettings(settings);
  if (
    !Number.isFinite(strategy.supportPrice) ||
    !Number.isFinite(strategy.resistancePrice) ||
    strategy.supportPrice >= strategy.resistancePrice
  ) {
    throw new RangeError("The strategy needs a valid support below resistance.");
  }
  if (
    instrumentMetadata[strategy.symbol].family !==
    instrumentMetadata[settings.symbol].family
  ) {
    throw new RangeError(
      `This strategy's levels are configured for ${instrumentMetadata[strategy.symbol].family} contracts. Choose NQ/MNQ or edit the strategy for ${instrumentMetadata[settings.symbol].family} prices.`,
    );
  }

  const marketData = provider.getCandles(settings);
  const candles = marketData.candles;
  if (candles.length < 2) {
    throw new Error("The selected synthetic window did not provide enough candles.");
  }
  for (let candleIndex = 0; candleIndex < candles.length; candleIndex += 1) {
    const candle = candles[candleIndex];
    const validCandle =
      Number.isFinite(candle.timestamp) &&
      Number.isFinite(candle.open) &&
      Number.isFinite(candle.high) &&
      Number.isFinite(candle.low) &&
      Number.isFinite(candle.close) &&
      Number.isFinite(candle.volume) &&
      candle.high >= Math.max(candle.open, candle.close, candle.low) &&
      candle.low <= Math.min(candle.open, candle.close, candle.high) &&
      candle.volume >= 0;
    if (!validCandle) {
      throw new Error(`Market data contains an invalid OHLCV candle at index ${candleIndex}.`);
    }
    if (
      candleIndex > 0 &&
      candle.timestamp <= candles[candleIndex - 1].timestamp
    ) {
      throw new Error("Market-data candle timestamps must be strictly increasing.");
    }
  }

  const instrument = instrumentMetadata[settings.symbol];
  const slip = settings.slippageTicks * instrument.tickSize;
  const trades: BacktestTrade[] = [];
  let position: Position | null = null;
  let equity = settings.startingBalance;
  let peakEquity = equity;
  let maxDrawdown = 0;
  let maxDrawdownPercent = 0;
  const equityCurve: EquityPoint[] = [
    { timestamp: candles[0].timestamp, equity },
  ];

  const recordTrade = (trade: BacktestTrade) => {
    trades.push(trade);
    equity += trade.netPnl;
    const drawdown = Math.max(0, peakEquity - equity);
    const drawdownPercent = peakEquity > 0 ? (drawdown / peakEquity) * 100 : 0;
    maxDrawdown = Math.max(maxDrawdown, drawdown);
    maxDrawdownPercent = Math.max(maxDrawdownPercent, drawdownPercent);
    peakEquity = Math.max(peakEquity, equity);
    equityCurve.push({ timestamp: trade.exitTime, equity });
  };

  let index = 1;
  while (index < candles.length) {
    if (position) {
      const candle = candles[index];
      const exit = resolveBracketExit(position, candle, slip, instrument.tickSize);
      if (exit) {
        recordTrade(
          closeTrade(
            position,
            exit.price,
            candle.timestamp,
            exit.reason,
            settings,
            trades.length + 1,
          ),
        );
        position = null;
      }
      index += 1;
      continue;
    }

    if (index >= candles.length - 1) break;
    const signal = getSignal(candles[index - 1], candles[index], strategy);
    if (!signal) {
      index += 1;
      continue;
    }

    const entryCandle = candles[index + 1];
    const entryPrice = roundToTick(
      entryCandle.open + (signal === "Long" ? slip : -slip),
      instrument.tickSize,
    );
    position = {
      side: signal,
      entryTime: entryCandle.timestamp,
      entryPrice,
      stopPrice: roundToTick(
        entryPrice +
          (signal === "Long"
            ? -settings.stopLossPoints
            : settings.stopLossPoints),
        instrument.tickSize,
      ),
      targetPrice: roundToTick(
        entryPrice +
          (signal === "Long"
            ? settings.takeProfitPoints
            : -settings.takeProfitPoints),
        instrument.tickSize,
      ),
    };

    const entryBarExit = resolveBracketExit(
      position,
      entryCandle,
      slip,
      instrument.tickSize,
    );
    if (entryBarExit) {
      recordTrade(
        closeTrade(
          position,
          entryBarExit.price,
          entryCandle.timestamp,
          entryBarExit.reason,
          settings,
          trades.length + 1,
        ),
      );
      position = null;
    }
    index += 2;
  }

  if (position) {
    const lastCandle = candles[candles.length - 1];
    const exitPrice = roundToTick(
      lastCandle.close + (position.side === "Long" ? -slip : slip),
      instrument.tickSize,
    );
    recordTrade(
      closeTrade(
        position,
        exitPrice,
        lastCandle.timestamp,
        "End of test",
        settings,
        trades.length + 1,
      ),
    );
  }

  const winningTrades = trades.filter((trade) => trade.netPnl > 0);
  const losingTrades = trades.filter((trade) => trade.netPnl < 0);
  const grossWins = winningTrades.reduce((total, trade) => total + trade.netPnl, 0);
  const grossLosses = Math.abs(
    losingTrades.reduce((total, trade) => total + trade.netPnl, 0),
  );
  const dataWarnings = [...marketData.coverage.limitations];
  if (marketData.coverage.missingIntervals.length) {
    dataWarnings.push(
      `${marketData.coverage.missingIntervals.length} missing-data interval(s) were reported by the provider.`,
    );
  }

  return {
    providerLabel: provider.label,
    candleCount: candles.length,
    dataCoverage: marketData.coverage,
    dataWarnings,
    startingBalance: settings.startingBalance,
    endingBalance: equity,
    totalPnl: equity - settings.startingBalance,
    winRate: trades.length
      ? (winningTrades.length / trades.length) * 100
      : null,
    profitFactor: grossLosses > 0 ? grossWins / grossLosses : null,
    maxDrawdown,
    maxDrawdownPercent,
    trades,
    equityCurve,
    assumptions:
      "Signals use completed candles and enter at the next candle open. If one synthetic candle touches both stop and target, the stop is assumed to fill first. Fees are charged on both sides and slippage is applied to each fill. Equity and drawdown use realized closed-trade P&L; open positions are not marked to market.",
  };
}
