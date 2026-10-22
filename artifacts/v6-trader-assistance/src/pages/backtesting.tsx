import { useMemo, useState } from "react";
import { ArrowLeft, ChartNoAxesCombined, Play, Settings2 } from "lucide-react";
import {
  TIMEFRAMES,
  instrumentMetadata,
  runBacktest,
  type BacktestResult,
  type BacktestSettings,
  type Timeframe,
} from "../lib/backtest-engine";
import {
  FUTURES_SYMBOLS,
  getCurrentStrategyVersion,
  type FuturesSymbol,
  type SavedStrategy,
} from "../lib/strategies";
import "./backtesting-strategies.css";

type BacktestingPageProps = {
  strategies: SavedStrategy[];
  selectedStrategyId: string;
  onSelectedStrategyChange(id: string): void;
  onBack(): void;
  onManageStrategies(): void;
};

const dateToday = new Date();
const endDefault = dateToday.toISOString().slice(0, 10);
const startDefault = new Date(dateToday.getTime() - 13 * 86400000).toISOString().slice(0, 10);

const currency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const price = (value: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);

function EquityCurve({ result }: { result: BacktestResult }) {
  const width = 800;
  const height = 190;
  const pad = { top: 12, right: 12, bottom: 14, left: 12 };
  const values = result.equityCurve.map((point) => point.equity);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1, max - min);
  const points = result.equityCurve.map((point, index) => {
    const x = pad.left + (index / Math.max(1, result.equityCurve.length - 1)) * (width - pad.left - pad.right);
    const y = pad.top + ((max - point.equity) / span) * (height - pad.top - pad.bottom);
    return { x, y };
  });
  const line = points.map((point) => `${point.x},${point.y}`).join(" ");
  const area = `${pad.left},${height - pad.bottom} ${line} ${width - pad.right},${height - pad.bottom}`;
  const positive = result.totalPnl >= 0;
  const stroke = positive ? "#00d1a0" : "#f25273";
  const dateLabel = (timestamp: number) =>
    new Date(timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

  return (
    <section className="tl-panel" aria-labelledby="equity-title">
      <div className="tl-panel-head">
        <h2 id="equity-title">Equity curve</h2>
        <span className="tl-helper">{result.candleCount} synthetic candles</span>
      </div>
      <div className="tl-chart-wrap">
        <svg
          className="tl-chart"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`Equity curve with ${result.equityCurve.length} points, ending at ${currency(result.endingBalance)}. Starting equity ${currency(result.startingBalance)}.`}
          data-testid="chart-equity-curve"
        >
          <defs>
            <linearGradient id="tl-equity-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity=".19" />
              <stop offset="100%" stopColor={stroke} stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 1, 2, 3].map((step) => {
            const y = pad.top + (step / 3) * (height - pad.top - pad.bottom);
            return <line key={step} x1={pad.left} x2={width - pad.right} y1={y} y2={y} stroke="rgba(117,134,169,.16)" strokeDasharray="3 5" />;
          })}
          <polygon points={area} fill="url(#tl-equity-fill)" />
          <polyline points={line} fill="none" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          {points.length > 0 && <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="4" fill={stroke} stroke="#09101d" strokeWidth="2" />}
        </svg>
        <div className="tl-chart-caption">
          <span>{dateLabel(result.equityCurve[0]?.timestamp ?? Date.now())}</span>
          <span>Start {currency(result.startingBalance)}</span>
          <span>{dateLabel(result.equityCurve[result.equityCurve.length - 1]?.timestamp ?? Date.now())}</span>
        </div>
      </div>
    </section>
  );
}

export default function BacktestingPage({
  strategies,
  selectedStrategyId,
  onSelectedStrategyChange,
  onBack,
  onManageStrategies,
}: BacktestingPageProps) {
  const selectedStrategy = strategies.find((item) => item.id === selectedStrategyId) ?? strategies[0];
  const currentVersion = selectedStrategy ? getCurrentStrategyVersion(selectedStrategy) : undefined;
  const [symbol, setSymbol] = useState<FuturesSymbol>(currentVersion?.config.symbol ?? "NQ");
  const [timeframe, setTimeframe] = useState<Timeframe>("5m");
  const [startDate, setStartDate] = useState(startDefault);
  const [endDate, setEndDate] = useState(endDefault);
  const [startingBalance, setStartingBalance] = useState("25000");
  const [contractQuantity, setContractQuantity] = useState("1");
  const [commission, setCommission] = useState("2.40");
  const [slippageTicks, setSlippageTicks] = useState("1");
  const [stopLossPoints, setStopLossPoints] = useState(String(currentVersion?.config.stopLossPoints ?? 16));
  const [takeProfitPoints, setTakeProfitPoints] = useState(String(currentVersion?.config.takeProfitPoints ?? 32));
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [error, setError] = useState("");
  const [runCount, setRunCount] = useState(0);

  const strategyOptions = useMemo(
    () => strategies.map((strategy) => ({ strategy, version: getCurrentStrategyVersion(strategy) })),
    [strategies],
  );

  const handleStrategyChange = (id: string) => {
    onSelectedStrategyChange(id);
    const next = strategies.find((strategy) => strategy.id === id);
    if (next) {
      const config = getCurrentStrategyVersion(next).config;
      setSymbol(config.symbol);
      setStopLossPoints(String(config.stopLossPoints));
      setTakeProfitPoints(String(config.takeProfitPoints));
    }
    setResult(null);
    setError("");
  };

  const run = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedStrategy || !currentVersion) {
      setError("Choose or create a saved strategy before running a backtest.");
      return;
    }
    try {
      const settings: BacktestSettings = {
        symbol,
        timeframe,
        startDate,
        endDate,
        startingBalance: Number(startingBalance),
        contractQuantity: Number(contractQuantity),
        commissionPerContractPerSide: Number(commission),
        slippageTicks: Number(slippageTicks),
        stopLossPoints: Number(stopLossPoints),
        takeProfitPoints: Number(takeProfitPoints),
      };
      const nextResult = runBacktest(currentVersion.config, settings);
      setResult(nextResult);
      setRunCount((count) => count + 1);
      setError("");
    } catch (cause) {
      setResult(null);
      setError(cause instanceof Error ? cause.message : "The backtest could not be completed.");
    }
  };

  const metrics = result
    ? [
        { label: "Total P&L", value: currency(result.totalPnl), color: result.totalPnl >= 0 ? "tl-positive" : "tl-negative", testId: "result-total-pnl" },
        { label: "Win rate", value: result.winRate === null ? "—" : `${result.winRate.toFixed(1)}%`, color: "", testId: "result-win-rate" },
        { label: "Profit factor", value: result.profitFactor === null ? (result.trades.some((trade) => trade.netPnl > 0) ? "∞" : "—") : result.profitFactor.toFixed(2), color: "", testId: "result-profit-factor" },
        { label: "Max drawdown", value: currency(result.maxDrawdown), color: "tl-negative", testId: "result-max-drawdown" },
      ]
    : [];

  return (
    <main className="trading-lab-page" aria-label="Backtesting workspace">
      <header className="trading-lab-header">
        <div className="trading-lab-identity">
          <div className="trading-lab-mark"><ChartNoAxesCombined size={16} /></div>
          <div>
            <h1>Backtesting</h1>
            <p>Inspect simulated strategy behavior · Synthetic demo only</p>
          </div>
        </div>
        <button className="trading-lab-back" type="button" onClick={onBack} data-testid="button-back-to-dashboard">
          <ArrowLeft size={14} /><span>Back to Dashboard</span>
        </button>
      </header>

      <div className="tl-layout">
        <section className="tl-panel" aria-labelledby="test-config-heading">
          <div className="tl-panel-head">
            <h2 id="test-config-heading"><Settings2 size={13} style={{ verticalAlign: "-2px", marginRight: 5 }} />Test configuration</h2>
          </div>
          <form className="tl-panel-body" onSubmit={run}>
            <div className="tl-field-grid">
              <div className="tl-field tl-field-wide">
                <label htmlFor="bt-strategy">Saved strategy</label>
                <select id="bt-strategy" value={selectedStrategy?.id ?? ""} onChange={(event) => handleStrategyChange(event.target.value)} data-testid="select-strategy">
                  {strategyOptions.length === 0 && <option value="">No saved strategies</option>}
                  {strategyOptions.map(({ strategy, version }) => <option key={strategy.id} value={strategy.id}>{version.config.name} · v{version.version}</option>)}
                </select>
              </div>
              <div className="tl-field">
                <label htmlFor="bt-symbol">Contract</label>
                <select id="bt-symbol" value={symbol} onChange={(event) => setSymbol(event.target.value as FuturesSymbol)} data-testid="select-symbol">
                  {FUTURES_SYMBOLS.map((value) => <option key={value} value={value}>{value} · {instrumentMetadata[value].family}</option>)}
                </select>
              </div>
              <div className="tl-field">
                <label htmlFor="bt-timeframe">Timeframe</label>
                <select id="bt-timeframe" value={timeframe} onChange={(event) => setTimeframe(event.target.value as Timeframe)} data-testid="select-timeframe">
                  {TIMEFRAMES.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </div>
              <div className="tl-field">
                <label htmlFor="bt-start">Start date</label>
                <input id="bt-start" type="date" value={startDate} max={endDate} onChange={(event) => setStartDate(event.target.value)} data-testid="input-start-date" />
              </div>
              <div className="tl-field">
                <label htmlFor="bt-end">End date</label>
                <input id="bt-end" type="date" value={endDate} min={startDate} onChange={(event) => setEndDate(event.target.value)} data-testid="input-end-date" />
              </div>
              <div className="tl-field">
                <label htmlFor="bt-balance">Starting balance ($)</label>
               <input id="bt-balance" type="number" min="1" step="1" value={startingBalance} onChange={(event) => setStartingBalance(event.target.value)} data-testid="input-starting-balance" />
              </div>
              <div className="tl-field">
                <label htmlFor="bt-qty">Contracts</label>
                <input id="bt-qty" type="number" min="1" step="1" value={contractQuantity} onChange={(event) => setContractQuantity(event.target.value)} data-testid="input-contract-quantity" />
              </div>
              <div className="tl-field">
                <label htmlFor="bt-fees">Fee / contract / side ($)</label>
                <input id="bt-fees" type="number" min="0" step="0.01" value={commission} onChange={(event) => setCommission(event.target.value)} data-testid="input-commission" />
              </div>
              <div className="tl-field">
                <label htmlFor="bt-slip">Slippage (ticks)</label>
                <input id="bt-slip" type="number" min="0" step="1" value={slippageTicks} onChange={(event) => setSlippageTicks(event.target.value)} data-testid="input-slippage" />
              </div>
              <div className="tl-field">
                <label htmlFor="bt-stop">Stop (points)</label>
                 <input id="bt-stop" type="number" min={instrumentMetadata[symbol].tickSize} step={instrumentMetadata[symbol].tickSize} value={stopLossPoints} onChange={(event) => setStopLossPoints(event.target.value)} data-testid="input-stop-points" />
              </div>
              <div className="tl-field">
                <label htmlFor="bt-target">Target (points)</label>
                 <input id="bt-target" type="number" min={instrumentMetadata[symbol].tickSize} step={instrumentMetadata[symbol].tickSize} value={takeProfitPoints} onChange={(event) => setTakeProfitPoints(event.target.value)} data-testid="input-target-points" />
              </div>
            </div>
            <p className="tl-helper" style={{ margin: "11px 0" }}>The selected strategy supplies its support/resistance entry rule. Stop and target values here override that version for this run.</p>
            {currentVersion && instrumentMetadata[currentVersion.config.symbol].family !== instrumentMetadata[symbol].family && (
              <div className="tl-error" role="status" data-testid="notice-symbol-family-mismatch">
                This strategy’s levels are for {instrumentMetadata[currentVersion.config.symbol].family} contracts. Select NQ/MNQ or edit its levels for {instrumentMetadata[symbol].family} prices before running.
              </div>
            )}
            {error && <div className="tl-error" role="alert" data-testid="status-backtest-error">{error}</div>}
            <div className="tl-action-row" style={{ marginTop: 10 }}>
              <button className="tl-button tl-button-primary" type="submit" disabled={!selectedStrategy} data-testid="button-run-backtest"><Play size={13} />Run backtest</button>
              <button className="tl-button tl-button-quiet" type="button" onClick={onManageStrategies} data-testid="button-manage-strategies">Manage strategies</button>
            </div>
            <div className="tl-notice" style={{ marginTop: 12 }} data-testid="notice-synthetic-data">
              Dates define a synthetic demo window only. Candles are generated, not historical; no live provider is connected. The engine caps each run at 360 candles, so longer windows are sampled across that span.
            </div>
          </form>
        </section>

        <section className="tl-results" aria-label="Backtest results">
          {!result ? (
            <section className="tl-panel tl-empty" aria-live="polite" data-testid="state-backtest-empty">
              <div>
                <strong>{error ? "Run needs attention" : "No run yet"}</strong>
                <p>{error ? "Correct the configuration and run again. The results panel will update here." : "Choose a saved rule set, tune the simulated costs, then run a synthetic test."}</p>
                {!strategies.length && <button className="tl-button tl-button-primary" type="button" onClick={onManageStrategies} data-testid="button-create-first-strategy">Create a strategy</button>}
              </div>
            </section>
          ) : (
            <>
              <div className="tl-result-topline" data-testid="status-backtest-complete">
                <span>{selectedStrategy ? getCurrentStrategyVersion(selectedStrategy).config.name : "Strategy"} · {symbol} · {timeframe} · {result.providerLabel}</span>
                <span>Run {runCount} · {result.trades.length} trades</span>
              </div>
              <div className="tl-metrics">
                {metrics.map((metric) => (
                  <div className="tl-metric" key={metric.testId} data-testid={metric.testId}>
                    <span className="tl-metric-label">{metric.label}</span>
                    <strong className={`tl-metric-value ${metric.color}`}>{metric.value}</strong>
                  </div>
                ))}
              </div>
              <EquityCurve result={result} />
              <section className="tl-panel" aria-labelledby="trade-history-title">
                <div className="tl-panel-head">
                  <h2 id="trade-history-title">Trade history</h2>
                  <span className="tl-helper">End balance {currency(result.endingBalance)} · DD {result.maxDrawdownPercent.toFixed(1)}%</span>
                </div>
                {result.trades.length ? (
                  <div className="tl-table-scroll">
                    <table className="tl-table" data-testid="table-trade-history">
                      <thead><tr><th>Trade</th><th>Side</th><th>Entry → exit</th><th>Qty</th><th>Exit</th><th>Net P&amp;L</th></tr></thead>
                      <tbody>
                        {result.trades.map((trade) => (
                          <tr key={trade.id} data-testid={`row-trade-${trade.id}`}>
                            <td className="tl-mono">#{trade.id}</td>
                            <td>{trade.side}</td>
                            <td className="tl-mono">{price(trade.entryPrice)} → {price(trade.exitPrice)}</td>
                            <td>{trade.quantity}</td>
                            <td>{trade.exitReason}</td>
                            <td className={`tl-mono ${trade.netPnl >= 0 ? "tl-positive" : "tl-negative"}`}>{currency(trade.netPnl)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="tl-empty" data-testid="state-no-trades"><div><strong>No signals in this window</strong><p>Try another synthetic window or adjust the saved support/resistance levels.</p></div></div>
                )}
              </section>
              <details className="tl-panel">
                <summary className="tl-panel-head" style={{ cursor: "pointer", color: "#aab6cc", fontSize: 9 }}>Model assumptions</summary>
                <div className="tl-panel-body">
                  <p className="tl-helper" data-testid="text-backtest-assumptions">{result.assumptions}</p>
                  <p className="tl-helper">Requested timezone: {result.dataCoverage.requestedTimezone} · Candle timestamps: {result.dataCoverage.timestampTimezone} · Contract roll policy: {result.dataCoverage.rollPolicy}</p>
                  {result.dataWarnings.length > 0 && (
                    <ul className="tl-data-warnings" data-testid="list-data-warnings">
                      {result.dataWarnings.map((warning, index) => <li key={`${index}-${warning}`}>{warning}</li>)}
                    </ul>
                  )}
                  {result.dataCoverage.missingIntervals.length > 0 && (
                    <p className="tl-helper" data-testid="text-missing-data-intervals">
                      Provider-reported missing intervals: {result.dataCoverage.missingIntervals.length}
                    </p>
                  )}
                </div>
              </details>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
