import { useEffect, useState } from "react";
import { getAccountStorageKey } from "../lib/account-storage";
import {
  Settings2,
  SlidersHorizontal,
  ShieldCheck,
  Bot,
  Palette,
  RotateCcw,
  Save,
  Check,
} from "lucide-react";

type Settings = {
  defaultMarket: string;
  strategy: string;
  dailyLossLimit: number;
  dailyProfitTarget: number;
  maxTrades: number;
  responseStyle: string;
  explanationDetail: string;
  showRiskWarnings: boolean;
  confirmBeforeAnalysis: boolean;
};

const storageKey = "v6-trader-settings:v1";

const defaults: Settings = {
  defaultMarket: "MNQ",
  strategy: "Support & Resistance",
  dailyLossLimit: 100,
  dailyProfitTarget: 200,
  maxTrades: 5,
  responseStyle: "Balanced",
  explanationDetail: "Detailed",
  showRiskWarnings: true,
  confirmBeforeAnalysis: false,
};

function readSettings(userId: string): Settings {
  try {
    const saved = localStorage.getItem(getAccountStorageKey(storageKey, userId));
    if (!saved) return defaults;

    const parsed = JSON.parse(saved);
    return {
      ...defaults,
      ...parsed,
      dailyLossLimit:
        typeof parsed.dailyLossLimit === "number"
          ? parsed.dailyLossLimit
          : defaults.dailyLossLimit,
      dailyProfitTarget:
        typeof parsed.dailyProfitTarget === "number"
          ? parsed.dailyProfitTarget
          : defaults.dailyProfitTarget,
      maxTrades:
        typeof parsed.maxTrades === "number"
          ? parsed.maxTrades
          : defaults.maxTrades,
    };
  } catch {
    return defaults;
  }
}

const pageStyle: React.CSSProperties = {
  minHeight: "100%",
  height: "100%",
  overflowY: "auto",
  boxSizing: "border-box",
  padding: "28px",
  background: "#0B1120",
  color: "#F1F5F9",
  fontFamily: "inherit",
};

const cardStyle: React.CSSProperties = {
  background: "#111C30",
  border: "1px solid #24334D",
  borderRadius: 16,
  padding: 22,
  marginBottom: 18,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "11px 12px",
  background: "#0B1425",
  border: "1px solid #334967",
  borderRadius: 9,
  color: "#F1F5F9",
  fontSize: 14,
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  color: "#D7E2F0",
  fontSize: 14,
  fontWeight: 600,
  marginBottom: 8,
};

function SectionTitle({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 13,
        marginBottom: 22,
      }}
    >
      <div
        style={{
          display: "grid",
          placeItems: "center",
          width: 44,
          height: 44,
          borderRadius: 12,
          background: "#173A65",
          color: "#78B8FF",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <h2 style={{ fontSize: 19, margin: "0 0 5px" }}>{title}</h2>
        <p style={{ color: "#91A5BF", fontSize: 13, margin: 0 }}>
          {description}
        </p>
      </div>
    </div>
  );
}

export default function SettingsPage({
  onBack,
  userId,
}: {
  onBack?: () => void;
  userId: string;
}) {
  const [settings, setSettings] = useState<Settings>(() => readSettings(userId));
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(
        getAccountStorageKey(storageKey, userId),
        JSON.stringify(settings),
      );
      setSaved(true);
    } catch {
      setSaved(false);
    }
  }, [settings, userId]);

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  function resetSettings() {
    setSettings({ ...defaults });
  }

  function field<K extends keyof Settings>(
    label: string,
    key: K,
    options: { value: Settings[K]; label: string }[],
  ) {
    return (
      <label style={{ display: "block" }}>
        <span style={labelStyle}>{label}</span>
        <select
          value={String(settings[key])}
          onChange={(event) => update(key, event.target.value as Settings[K])}
          style={inputStyle}
        >
          {options.map((option) => (
            <option key={option.label} value={String(option.value)}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  function numberField(
    label: string,
    key: "dailyLossLimit" | "dailyProfitTarget" | "maxTrades",
    min: number,
    max: number,
  ) {
    return (
      <label style={{ display: "block" }}>
        <span style={labelStyle}>{label}</span>
        <input
          type="number"
          min={min}
          max={max}
          value={settings[key]}
          onChange={(event) => {
            const raw = event.target.value;
            if (raw === "") return;
            const value = Number(raw);
            if (Number.isFinite(value)) {
              update(key, Math.min(max, Math.max(min, value)));
            }
          }}
          style={inputStyle}
        />
      </label>
    );
  }

  function toggle(
    title: string,
    description: string,
    key: "showRiskWarnings" | "confirmBeforeAnalysis",
  ) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          padding: "16px 0",
          borderTop: "1px solid #24334D",
        }}
      >
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{title}</div>
          <div
            style={{
              color: "#91A5BF",
              fontSize: 12,
              lineHeight: 1.6,
              marginTop: 5,
            }}
          >
            {description}
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={settings[key]}
          aria-label={title}
          onClick={() => update(key, !settings[key])}
          style={{
            width: 46,
            height: 26,
            padding: 3,
            borderRadius: 99,
            border: "1px solid #334967",
            background: settings[key] ? "#2563A6" : "#263449",
            cursor: "pointer",
            flexShrink: 0,
            textAlign: "left",
          }}
        >
          <span
            style={{
              display: "block",
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: "#FFFFFF",
              transform: settings[key] ? "translateX(19px)" : "translateX(0)",
              transition: "transform 150ms ease",
            }}
          />
        </button>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 28,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              display: "grid",
              placeItems: "center",
              width: 48,
              height: 48,
              borderRadius: 14,
              background: "#173A65",
              color: "#78B8FF",
            }}
          >
            <Settings2 size={26} />
          </div>
          <div>
            <div
              style={{
                color: "#78B8FF",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 2,
              }}
            >
              V6 TRADER ASSISTANCE
            </div>
            <h1 style={{ fontSize: 28, margin: "4px 0" }}>Settings</h1>
            <p style={{ color: "#91A5BF", fontSize: 13, margin: 0 }}>
              Customize your trading workspace.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {onBack && (
            <button
              onClick={onBack}
              style={{
                padding: "10px 13px",
                borderRadius: 9,
                background: "#172740",
                border: "1px solid #334967",
                color: "#EAF3FF",
                cursor: "pointer",
              }}
            >
              Back to Dashboard
            </button>
          )}
          <button
            onClick={resetSettings}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "10px 13px",
              borderRadius: 9,
              background: "#172740",
              border: "1px solid #334967",
              color: "#EAF3FF",
              cursor: "pointer",
            }}
          >
            <RotateCcw size={15} /> Reset defaults
          </button>
        </div>
      </div>

      <div
        style={{
          maxWidth: 1000,
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 380px), 1fr))",
          gap: 18,
          alignItems: "start",
        }}
      >
        <div>
          <section style={cardStyle}>
            <SectionTitle
              icon={<SlidersHorizontal size={22} />}
              title="Trading Preferences"
              description="Choose your default analysis setup."
            />
            <div style={{ display: "grid", gap: 18 }}>
              {field("Default market", "defaultMarket", [
                { value: "MNQ", label: "MNQ — Micro Nasdaq" },
                { value: "NQ", label: "NQ — Nasdaq" },
                { value: "MES", label: "MES — Micro S&P 500" },
                { value: "ES", label: "ES — S&P 500" },
                { value: "MYM", label: "MYM — Micro Dow" },
                { value: "YM", label: "YM — Dow" },
                { value: "US30", label: "US30 — Dow Jones CFD" },
                { value: "EURUSD", label: "EUR/USD — Forex" },
                { value: "GBPUSD", label: "GBP/USD — Forex" },
                { value: "XAUUSD", label: "XAU/USD — Gold" },
              ])}
              {field("Preferred strategy", "strategy", [
                {
                  value: "Support & Resistance",
                  label: "Support & Resistance",
                },
                { value: "Break & Retest", label: "Break & Retest" },
                { value: "Price Action", label: "Price Action" },
                { value: "Trend Following", label: "Trend Following" },
              ])}
            </div>
          </section>

          <section style={cardStyle}>
            <SectionTitle
              icon={<ShieldCheck size={22} />}
              title="Risk Management"
              description="Set your personal trading guardrails."
            />
            <div style={{ display: "grid", gap: 18 }}>
              {numberField(
                "Daily loss limit ($)",
                "dailyLossLimit",
                1,
                1000000,
              )}
              {numberField(
                "Daily profit target ($)",
                "dailyProfitTarget",
                1,
                1000000,
              )}
              {numberField("Maximum trades per day", "maxTrades", 1, 100)}
            </div>
            <p
              style={{
                color: "#91A5BF",
                fontSize: 12,
                lineHeight: 1.7,
                margin: "18px 0 0",
              }}
            >
              These are planning preferences only. They do not automatically
              block orders or enforce limits in your broker or prop-firm
              account.
            </p>
            {toggle(
              "Show risk reminders",
              "Remind me to review risk before making trading decisions.",
              "showRiskWarnings",
            )}
          </section>
        </div>

        <div>
          <section style={cardStyle}>
            <SectionTitle
              icon={<Bot size={22} />}
              title="AI Assistant"
              description="Choose how V6 explains trading concepts."
            />
            <div style={{ display: "grid", gap: 18 }}>
              {field("Response style", "responseStyle", [
                { value: "Concise", label: "Concise — straight to the point" },
                { value: "Balanced", label: "Balanced — clear and practical" },
                { value: "Coach", label: "Coach — step-by-step guidance" },
              ])}
              {field("Explanation detail", "explanationDetail", [
                { value: "Simple", label: "Simple — beginner-friendly" },
                {
                  value: "Detailed",
                  label: "Detailed — explain the reasoning",
                },
                {
                  value: "Advanced",
                  label: "Advanced — deeper technical detail",
                },
              ])}
            </div>
            {toggle(
              "Confirm before analysis",
              "Use this preference for future confirmation flows when supported.",
              "confirmBeforeAnalysis",
            )}
            <p
              style={{
                color: "#91A5BF",
                fontSize: 12,
                lineHeight: 1.7,
                marginBottom: 0,
              }}
            >
              These preferences are stored here. They will affect AI responses
              only after the Chat and Market Analysis pages are connected to
              these settings.
            </p>
          </section>

          <section style={cardStyle}>
            <SectionTitle
              icon={<Palette size={22} />}
              title="Appearance"
              description="Your current workspace theme."
            />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: "#0B1425",
                border: "1px solid #283A55",
                borderRadius: 12,
                padding: 15,
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: "#173A65",
                  display: "grid",
                  placeItems: "center",
                  color: "#78B8FF",
                }}
              >
                <Palette size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>Dark navy</div>
                <div style={{ color: "#91A5BF", fontSize: 12, marginTop: 4 }}>
                  Matches your current V6 interface.
                </div>
              </div>
              <span
                style={{
                  fontSize: 11,
                  color: "#93C5FD",
                  background: "#183557",
                  padding: "5px 8px",
                  borderRadius: 7,
                }}
              >
                Active
              </span>
            </div>
          </section>

          <section
            style={{
              ...cardStyle,
              background: "#102438",
              borderColor: "#245078",
            }}
          >
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ color: "#78B8FF" }}>
                {saved ? <Check size={21} /> : <Save size={21} />}
              </div>
              <div>
                <div style={{ fontWeight: 700 }}>
                  {saved
                    ? "Preferences saved locally"
                    : "Local saving unavailable"}
                </div>
                <p
                  style={{
                    color: "#AFC0D5",
                    fontSize: 12,
                    lineHeight: 1.6,
                    margin: "5px 0 0",
                  }}
                >
                  {saved
                    ? "Your latest preferences are stored in this browser."
                    : "Your changes may not persist after a refresh."}
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>

      <p
        style={{
          color: "#7186A2",
          fontSize: 12,
          lineHeight: 1.7,
          marginTop: 8,
        }}
      >
        V6 TRADER ASSISTANCE · Settings are saved in this browser and are not
        synced across devices.
      </p>
    </div>
  );
}
