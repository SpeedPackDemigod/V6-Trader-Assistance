import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Code2, Plus, Save, Send, Trash2 } from "lucide-react";
import {
  addStrategyVersion,
  createStrategy,
  FUTURES_SYMBOLS,
  getCurrentStrategyVersion,
  type EntryRule,
  type FuturesSymbol,
  type SavedStrategy,
  type StrategyConfig,
  type StrategyVersion,
  type TradeDirection,
} from "../lib/strategies";
import { instrumentMetadata } from "../lib/backtest-engine";
import "./backtesting-strategies.css";

type StrategiesPageProps = {
  strategies: SavedStrategy[];
  storageNotice?: string;
  onStrategiesChange(next: SavedStrategy[]): string | null;
  onSendToBacktesting(id: string): void;
  onBack(): void;
};

const defaultConfig: StrategyConfig = {
  name: "",
  symbol: "NQ",
  entryRule: "breakout",
  direction: "both",
  supportPrice: 21500,
  resistancePrice: 21580,
  stopLossPoints: 16,
  takeProfitPoints: 32,
};

const fieldOrder: (keyof StrategyConfig)[] = [
  "name", "symbol", "entryRule", "direction", "supportPrice", "resistancePrice", "stopLossPoints", "takeProfitPoints",
];

function toConfig(version: StrategyVersion): StrategyConfig {
  return { ...version.config };
}

function buildRulePreview(config: StrategyConfig) {
  const trigger = config.entryRule === "breakout"
    ? `Close crosses above resistance (${config.resistancePrice}) for long; below support (${config.supportPrice}) for short.`
    : `Price tests support (${config.supportPrice}) and closes back above for long; tests resistance (${config.resistancePrice}) and closes back below for short.`;
  const direction = config.direction === "both" ? "Long and short" : config.direction === "long" ? "Long only" : "Short only";
  return `// ${config.name || "Untitled strategy"} · ${config.symbol}
// Read-only rule preview — descriptive only; never executed.

ENTRY RULE: ${config.entryRule.toUpperCase()}
${trigger}
ALLOWED DIRECTION: ${direction}

RISK: stop ${config.stopLossPoints} points
REWARD: target ${config.takeProfitPoints} points

// Signals use completed synthetic candles.
// Entry is modeled at the following candle open.`;
}

function compareValue(value: unknown) {
  return typeof value === "number" ? value.toLocaleString("en-US", { maximumFractionDigits: 2 }) : String(value);
}

export default function StrategiesPage({
  strategies,
  storageNotice,
  onStrategiesChange,
  onSendToBacktesting,
  onBack,
}: StrategiesPageProps) {
  const [selectedId, setSelectedId] = useState(strategies[0]?.id ?? "");
  const [selectedVersionNumber, setSelectedVersionNumber] = useState<number | null>(null);
  const [compareVersionNumber, setCompareVersionNumber] = useState<number | null>(null);
  const [draft, setDraft] = useState<StrategyConfig>(defaultConfig);
  const [isCreating, setIsCreating] = useState(strategies.length === 0);
  const [error, setError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  const selected = strategies.find((item) => item.id === selectedId);
  const selectedVersion = selected?.versions.find((version) => version.version === selectedVersionNumber)
    ?? (selected ? getCurrentStrategyVersion(selected) : undefined);
  const compareVersion = selected?.versions.find((version) => version.version === compareVersionNumber);

  useEffect(() => {
    if (isCreating) return;
    if (!strategies.length) {
      setSelectedId("");
      setSelectedVersionNumber(null);
      setDraft(defaultConfig);
      return;
    }
    const currentId = strategies.some((item) => item.id === selectedId) ? selectedId : strategies[0].id;
    if (currentId !== selectedId) setSelectedId(currentId);
    const strategy = strategies.find((item) => item.id === currentId);
    if (!strategy) return;
    const current = getCurrentStrategyVersion(strategy);
    if (selectedVersionNumber === null || !strategy.versions.some((version) => version.version === selectedVersionNumber)) {
      setSelectedVersionNumber(current.version);
      setDraft(toConfig(current));
    }
  }, [strategies, selectedId, selectedVersionNumber, isCreating]);

  const versionOptions = useMemo(() => selected?.versions ?? [], [selected]);

  const chooseStrategy = (id: string) => {
    const strategy = strategies.find((item) => item.id === id);
    if (!strategy) return;
    setSelectedId(id);
    setIsCreating(false);
    setSelectedVersionNumber(getCurrentStrategyVersion(strategy).version);
    setCompareVersionNumber(null);
    setDraft(toConfig(getCurrentStrategyVersion(strategy)));
    setError("");
    setSaveMessage("");
  };

  const chooseVersion = (value: string) => {
    const versionNumber = Number(value);
    const version = selected?.versions.find((item) => item.version === versionNumber);
    if (!version) return;
    setSelectedVersionNumber(version.version);
    setDraft(toConfig(version));
    setError("");
    setSaveMessage("");
  };

  const updateDraft = <K extends keyof StrategyConfig>(key: K, value: StrategyConfig[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setSaveMessage("");
  };

  const changeSymbol = (symbol: FuturesSymbol) => {
    setDraft((current) => {
      const previousMetadata = instrumentMetadata[current.symbol];
      const nextMetadata = instrumentMetadata[symbol];
      const priceOffset =
        nextMetadata.syntheticBasePrice - previousMetadata.syntheticBasePrice;
      const roundToTick = (value: number) =>
        Number(
          (
            Math.round((value + priceOffset) / nextMetadata.tickSize) *
            nextMetadata.tickSize
          ).toFixed(4),
        );
      const roundDistanceUp = (value: number) =>
        Number(
          (
            Math.max(
              nextMetadata.tickSize,
              Math.ceil((value - 1e-9) / nextMetadata.tickSize) *
                nextMetadata.tickSize,
            )
          ).toFixed(4),
        );
      return {
        ...current,
        symbol,
        supportPrice: roundToTick(current.supportPrice),
        resistancePrice: roundToTick(current.resistancePrice),
        stopLossPoints: roundDistanceUp(current.stopLossPoints),
        takeProfitPoints: roundDistanceUp(current.takeProfitPoints),
      };
    });
    setSaveMessage("");
  };

  const validate = () => {
    if (!draft.name.trim()) return "Give this strategy a name.";
    if (!Number.isFinite(draft.supportPrice) || !Number.isFinite(draft.resistancePrice) || draft.supportPrice >= draft.resistancePrice) {
      return "Support must be a valid price below resistance.";
    }
    if (!Number.isFinite(draft.stopLossPoints) || draft.stopLossPoints <= 0) return "Stop distance must be greater than zero.";
    if (!Number.isFinite(draft.takeProfitPoints) || draft.takeProfitPoints <= 0) return "Target distance must be greater than zero.";
    return "";
  };

  const save = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    if (isCreating || !selected) {
      const created = createStrategy({ ...draft, name: draft.name.trim() });
      const storageError = onStrategiesChange([...strategies, created]);
      setSelectedId(created.id);
      setSelectedVersionNumber(1);
      setCompareVersionNumber(null);
      setIsCreating(false);
      setSaveMessage(storageError ? "" : "Strategy saved in this browser.");
    } else {
      const updated = addStrategyVersion(selected, { ...draft, name: draft.name.trim() });
      const storageError = onStrategiesChange(strategies.map((item) => item.id === selected.id ? updated : item));
      setSelectedVersionNumber(updated.versions[updated.versions.length - 1].version);
      setSaveMessage(storageError ? "" : `Version ${updated.versions.length} saved in this browser.`);
    }
    setError("");
  };

  const startNew = () => {
    setIsCreating(true);
    setSelectedId("");
    setSelectedVersionNumber(null);
    setCompareVersionNumber(null);
    setDraft(defaultConfig);
    setError("");
    setSaveMessage("");
  };

  const deleteSelected = () => {
    if (!selected) return;
    const name = getCurrentStrategyVersion(selected).config.name;
    if (!window.confirm(`Delete “${name}” and all of its saved versions from this browser?`)) return;
    const next = strategies.filter((strategy) => strategy.id !== selected.id);
    const storageError = onStrategiesChange(next);
    setSelectedId(next[0]?.id ?? "");
    setIsCreating(next.length === 0);
    setSelectedVersionNumber(null);
    setCompareVersionNumber(null);
    setDraft(next[0] ? toConfig(getCurrentStrategyVersion(next[0])) : defaultConfig);
    setSaveMessage(storageError ? "" : "Strategy deleted from this browser.");
  };

  const diffFields = selectedVersion && compareVersion
    ? fieldOrder.filter((key) => selectedVersion.config[key] !== compareVersion.config[key])
    : [];
  const readOnlyPreview = buildRulePreview(draft);

  return (
    <main className="trading-lab-page" aria-label="Strategies workspace">
      <header className="trading-lab-header">
        <div className="trading-lab-identity">
          <div className="trading-lab-mark"><Code2 size={16} /></div>
          <div>
            <h1>Strategies &amp; Code</h1>
            <p>Define support/resistance rules · Browser-local versions</p>
          </div>
        </div>
        <button className="trading-lab-back" type="button" onClick={onBack} data-testid="button-back-to-dashboard">
          <ArrowLeft size={14} /><span>Back to Dashboard</span>
        </button>
      </header>

      <div className="tl-strategy-layout">
        <aside className="tl-panel" aria-labelledby="saved-strategies-heading">
          <div className="tl-panel-head">
            <h2 id="saved-strategies-heading">Saved strategies <span className="tl-helper">({strategies.length})</span></h2>
            <button className="tl-button" type="button" onClick={startNew} data-testid="button-new-strategy"><Plus size={12} />New</button>
          </div>
          <div className="tl-panel-body">
            {storageNotice && <div className="tl-notice" role="status" data-testid="status-strategy-storage-notice" style={{ marginBottom: 10 }}>{storageNotice}</div>}
            {strategies.length ? (
              <div className="tl-strategy-list" role="list" data-testid="list-saved-strategies">
                {strategies.map((strategy) => {
                  const version = getCurrentStrategyVersion(strategy);
                  return (
                    <button
                      type="button"
                      role="listitem"
                      className="tl-strategy-item"
                      aria-current={!isCreating && strategy.id === selectedId ? "true" : undefined}
                      key={strategy.id}
                      onClick={() => chooseStrategy(strategy.id)}
                      data-testid={`button-select-strategy-${strategy.id}`}
                    >
                      <span style={{ minWidth: 0 }}>
                        <strong>{version.config.name}</strong>
                        <span>{version.config.symbol} · {version.config.entryRule} · {strategy.isExample ? "Starter example" : "Local"}</span>
                      </span>
                      <span className="tl-version-pill">v{version.version}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="tl-empty" data-testid="state-empty-strategies">
                <div><strong>Your rulebook starts here</strong><p>Create a support/resistance setup and save its first version locally in this browser.</p><button className="tl-button tl-button-primary" type="button" onClick={startNew} data-testid="button-empty-create-strategy"><Plus size={12} />Create strategy</button></div>
              </div>
            )}
            {!isCreating && selected && (
              <div className="tl-action-row" style={{ marginTop: 10 }}>
                <button className="tl-button tl-button-primary" type="button" onClick={() => onSendToBacktesting(selected.id)} data-testid="button-send-to-backtesting"><Send size={12} />Send to Backtesting</button>
                <button className="tl-button tl-button-danger" type="button" onClick={deleteSelected} data-testid="button-delete-strategy"><Trash2 size={12} />Delete</button>
              </div>
            )}
          </div>
        </aside>

        <div className="tl-results">
          <section className="tl-panel" aria-labelledby="strategy-editor-title">
            <div className="tl-panel-head">
              <h2 id="strategy-editor-title">{isCreating ? "New strategy" : "Strategy editor"}</h2>
              {!isCreating && selected && <span className="tl-helper">Created {new Date(selected.createdAt).toLocaleDateString()}</span>}
            </div>
            <form className="tl-panel-body" onSubmit={save}>
              {!isCreating && selected && (
                <div className="tl-version-tools" style={{ marginBottom: 12 }}>
                  <div className="tl-field">
                    <label htmlFor="strategy-version">Edit from version</label>
                    <select id="strategy-version" value={selectedVersion?.version ?? ""} onChange={(event) => chooseVersion(event.target.value)} data-testid="select-strategy-version">
                      {versionOptions.map((version) => <option key={version.version} value={version.version}>Version {version.version} · {new Date(version.savedAt).toLocaleDateString()}</option>)}
                    </select>
                  </div>
                  <div className="tl-field">
                    <label htmlFor="strategy-compare">Compare with</label>
                    <select id="strategy-compare" value={compareVersionNumber ?? ""} onChange={(event) => setCompareVersionNumber(event.target.value ? Number(event.target.value) : null)} data-testid="select-compare-version">
                      <option value="">Choose a version</option>
                      {versionOptions.map((version) => <option key={version.version} value={version.version}>Version {version.version}</option>)}
                    </select>
                  </div>
                </div>
              )}
              <div className="tl-field-grid">
                <div className="tl-field tl-field-wide">
                  <label htmlFor="strategy-name">Strategy name</label>
                  <input id="strategy-name" value={draft.name} onChange={(event) => updateDraft("name", event.target.value)} placeholder="e.g. Opening range retest" maxLength={64} required data-testid="input-strategy-name" />
                </div>
                <div className="tl-field">
                  <label htmlFor="strategy-symbol">Symbol</label>
                  <select id="strategy-symbol" value={draft.symbol} onChange={(event) => changeSymbol(event.target.value as FuturesSymbol)} data-testid="select-strategy-symbol">
                    {FUTURES_SYMBOLS.map((symbol) => <option key={symbol} value={symbol}>{symbol}</option>)}
                  </select>
                </div>
                <div className="tl-field">
                  <label htmlFor="strategy-rule">Entry rule</label>
                  <select id="strategy-rule" value={draft.entryRule} onChange={(event) => updateDraft("entryRule", event.target.value as EntryRule)} data-testid="select-entry-rule">
                    <option value="breakout">Breakout</option><option value="bounce">Bounce / rejection</option>
                  </select>
                </div>
                <div className="tl-field">
                  <label htmlFor="strategy-direction">Direction</label>
                  <select id="strategy-direction" value={draft.direction} onChange={(event) => updateDraft("direction", event.target.value as TradeDirection)} data-testid="select-direction">
                    <option value="both">Long and short</option><option value="long">Long only</option><option value="short">Short only</option>
                  </select>
                </div>
                <div className="tl-field">
                  <label htmlFor="strategy-support">Support price</label>
                  <input id="strategy-support" type="number" step={instrumentMetadata[draft.symbol].tickSize} value={draft.supportPrice} onChange={(event) => updateDraft("supportPrice", Number(event.target.value))} required data-testid="input-support-price" />
                </div>
                <div className="tl-field">
                  <label htmlFor="strategy-resistance">Resistance price</label>
                  <input id="strategy-resistance" type="number" step={instrumentMetadata[draft.symbol].tickSize} value={draft.resistancePrice} onChange={(event) => updateDraft("resistancePrice", Number(event.target.value))} required data-testid="input-resistance-price" />
                </div>
                <div className="tl-field">
                  <label htmlFor="strategy-stop">Stop loss (points)</label>
                  <input id="strategy-stop" type="number" min={instrumentMetadata[draft.symbol].tickSize} step={instrumentMetadata[draft.symbol].tickSize} value={draft.stopLossPoints} onChange={(event) => updateDraft("stopLossPoints", Number(event.target.value))} required data-testid="input-strategy-stop" />
                </div>
                <div className="tl-field">
                  <label htmlFor="strategy-target">Take profit (points)</label>
                  <input id="strategy-target" type="number" min={instrumentMetadata[draft.symbol].tickSize} step={instrumentMetadata[draft.symbol].tickSize} value={draft.takeProfitPoints} onChange={(event) => updateDraft("takeProfitPoints", Number(event.target.value))} required data-testid="input-strategy-target" />
                </div>
              </div>
              <p className="tl-helper" style={{ margin: "10px 0 0" }}>Changing between Nasdaq and Dow contracts shifts the levels by the same offset to the selected synthetic reference price.</p>
              {error && <div className="tl-error" role="alert" style={{ marginTop: 12 }} data-testid="status-strategy-error">{error}</div>}
              <div className="tl-action-row" style={{ marginTop: 13 }}>
                <button className="tl-button tl-button-primary" type="submit" data-testid="button-save-strategy"><Save size={12} />{isCreating ? "Create strategy" : "Save new version"}</button>
                {!isCreating && selected && selectedVersionNumber !== getCurrentStrategyVersion(selected).version && (
                  <span className="tl-helper">Editing an older version creates a new version; history remains unchanged.</span>
                )}
                <span className="tl-save-status" role="status" data-testid="status-strategy-save">{saveMessage}</span>
              </div>
            </form>
          </section>

          {!isCreating && selectedVersion && compareVersion && (
            <section className="tl-panel" aria-labelledby="compare-title" data-testid="panel-version-comparison">
              <div className="tl-panel-head"><h2 id="compare-title">Version {selectedVersion.version} compared with version {compareVersion.version}</h2></div>
              <div className="tl-panel-body">
                {diffFields.length ? (
                  <div className="tl-diff-list">
                    {diffFields.map((key) => (
                      <div className="tl-diff" key={key} data-testid={`diff-${key}`}>
                        <strong>{key.replaceAll(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase())}</strong>
                        v{selectedVersion.version}: {compareValue(selectedVersion.config[key])} &nbsp;·&nbsp; v{compareVersion.version}: {compareValue(compareVersion.config[key])}
                      </div>
                    ))}
                  </div>
                ) : <p className="tl-helper" data-testid="text-versions-identical">These versions have identical rule settings.</p>}
              </div>
            </section>
          )}

          <section className="tl-panel" aria-labelledby="code-preview-title">
            <div className="tl-panel-head">
              <h2 id="code-preview-title"><Code2 size={13} style={{ verticalAlign: "-2px", marginRight: 5 }} />Generated rule preview</h2>
              <span className="tl-helper">Read-only · descriptive, not executable</span>
            </div>
            <div className="tl-panel-body">
              <pre className="tl-code" data-testid="code-rule-preview">{readOnlyPreview}</pre>
              <p className="tl-helper" style={{ margin: "8px 0 0" }}>Versions are saved locally by the parent app in this browser. No server sync or code execution.</p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
