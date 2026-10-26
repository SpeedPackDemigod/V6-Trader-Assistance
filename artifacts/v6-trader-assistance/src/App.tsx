import EducationPage from "./pages/education";
import SettingsPage from "./pages/settings";
import BacktestingPage from "./pages/backtesting";
import StrategiesPage from "./pages/strategies";
import AllWorkspacesPage from "./pages/all-workspaces";
import type { ChatInput } from "@workspace/api-client-react";
import {
  CHAT_ATTACHMENT_ACCEPT,
  MAX_ATTACHMENT_BATCH_BYTES,
  MAX_ATTACHMENTS_PER_MESSAGE,
  MAX_DOCUMENT_CONTEXT_CHARS,
  blobToBase64,
  deleteChatAttachments,
  prepareChatAttachment,
  readChatAttachment,
  storeChatAttachment,
  type LocalChatAttachment,
  type PreparedChatAttachment,
} from "./lib/chat-attachments";
import {
  persistStrategies,
  readStoredStrategies,
  type SavedStrategy,
} from "./lib/strategies";
import { getAccountStorageKey } from "./lib/account-storage";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import {
  Activity,
  ArrowLeft,
  ArrowUpRight,
  Bell,
  BookOpen,
  Bot,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  ChevronDown,
  CircleHelp,
  CircleDollarSign,
  Clock3,
  Code2,
  FileText,
  GraduationCap,
  Layers3,
  LogOut,
  MessageCircle,
  MoreHorizontal,
  Newspaper,
  Paperclip,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Trash2,
  UserRound,
  Wallet,
  X,
} from "lucide-react";

type LocalMessage = {
  id: number;
  role: "user" | "assistant";
  text: string;
  attachments?: LocalChatAttachment[];
};
type ApiChatAttachment = NonNullable<
  ChatInput["messages"][number]["attachments"]
>[number];

type SavedChatConversation = {
  id: string;
  title: string;
  messages: LocalMessage[];
  createdAt: number;
  updatedAt: number;
};

type StoredChatHistory = {
  conversations: SavedChatConversation[];
  activeConversationId: string | null;
  storageError: boolean;
};

const CHAT_HISTORY_STORAGE_KEY = "v6-trader-assistance:chat-history:v1";
const MAX_CHAT_REQUEST_BYTES = 48 * 1024;
const MAX_REQUEST_ATTACHMENT_COUNT = 8;
const chatRequestEncoder = new TextEncoder();

function isLocalChatAttachment(value: unknown): value is LocalChatAttachment {
  if (typeof value !== "object" || value === null) return false;
  return (
    "id" in value &&
    typeof value.id === "string" &&
    "name" in value &&
    typeof value.name === "string" &&
    "mimeType" in value &&
    typeof value.mimeType === "string" &&
    "size" in value &&
    typeof value.size === "number" &&
    "kind" in value &&
    (value.kind === "image" || value.kind === "document") &&
    (!("preview" in value) || typeof value.preview === "string") &&
    (!("truncated" in value) || typeof value.truncated === "boolean")
  );
}

function isLocalMessage(value: unknown): value is LocalMessage {
  if (typeof value !== "object" || value === null) return false;
  return (
    "id" in value &&
    typeof value.id === "number" &&
    "role" in value &&
    (value.role === "user" || value.role === "assistant") &&
    "text" in value &&
    typeof value.text === "string" &&
    (!("attachments" in value) ||
      (Array.isArray(value.attachments) &&
        value.attachments.every(isLocalChatAttachment)))
  );
}

function ChatAttachmentList({
  attachments,
  onRemove,
  disabled = false,
}: {
  attachments?: LocalChatAttachment[];
  onRemove?: (id: string) => void;
  disabled?: boolean;
}) {
  if (!attachments?.length) return null;
  return (
    <div className="chat-attachment-list">
      {attachments.map((attachment) => (
        <div className="chat-attachment-card" key={attachment.id}>
          {attachment.kind === "image" && attachment.preview ? (
            <img src={attachment.preview} alt={attachment.name} />
          ) : (
            <FileText size={17} aria-hidden="true" />
          )}
          <span title={attachment.name}>
            {attachment.name}
            {attachment.truncated ? " · excerpt" : ""}
          </span>
          {onRemove && (
            <button
              type="button"
              aria-label={`Remove ${attachment.name}`}
              title={`Remove ${attachment.name}`}
              disabled={disabled}
              onClick={() => onRemove(attachment.id)}
            >
              <X size={13} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function selectChatRequestHistory(
  messages: LocalMessage[],
): LocalMessage[] {
  const selected: LocalMessage[] = [];
  let requestBytes = 15;

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const messageBytes = chatRequestEncoder.encode(messages[index].text).length;
    const separatorBytes = selected.length > 0 ? 1 : 0;
    if (requestBytes + messageBytes + separatorBytes > MAX_CHAT_REQUEST_BYTES) {
      break;
    }
    selected.unshift(messages[index]);
    requestBytes += messageBytes + separatorBytes;
  }

  if (selected[0]?.role === "assistant") selected.shift();
  return selected;
}

async function createChatRequestHistory(
  history: LocalMessage[],
): Promise<ChatInput["messages"]> {
  const selected = selectChatRequestHistory(history);
  const request: ChatInput["messages"] = new Array(selected.length);
  let attachmentBytes = 0;
  let documentChars = 0;
  let attachmentCount = 0;

  for (let index = selected.length - 1; index >= 0; index -= 1) {
    const source = selected[index];
    const attachments: ApiChatAttachment[] = [];
    const omittedNames: string[] = [];

    for (const item of [...(source.attachments ?? [])].reverse()) {
      if (
        attachmentCount >= MAX_REQUEST_ATTACHMENT_COUNT ||
        attachmentBytes >= MAX_ATTACHMENT_BATCH_BYTES
      ) {
        omittedNames.push(item.name);
        continue;
      }
      const stored = await readChatAttachment(item.id);
      if (!stored) {
        if (index === selected.length - 1) {
          throw new Error(`${item.name} is no longer available. Attach it again.`);
        }
        omittedNames.push(item.name);
        continue;
      }

      const content =
        stored.encoding === "text"
          ? await stored.blob.text()
          : await blobToBase64(stored.blob);
      const nextBytes = stored.blob.size;
      const nextDocumentChars =
        stored.encoding === "text" && item.kind === "document"
          ? content.length
          : 0;
      if (
        attachmentBytes + nextBytes > MAX_ATTACHMENT_BATCH_BYTES ||
        documentChars + nextDocumentChars > MAX_DOCUMENT_CONTEXT_CHARS
      ) {
        if (index === selected.length - 1) {
          throw new Error("These attachments exceed the chat context limit. Remove a file and try again.");
        }
        omittedNames.push(item.name);
        continue;
      }

      attachments.unshift({
        id: item.id,
        name: item.name,
        mimeType: item.mimeType,
        encoding: stored.encoding,
        ...(item.truncated ? { truncated: true } : {}),
        content,
      });
      attachmentBytes += nextBytes;
      documentChars += nextDocumentChars;
      attachmentCount += 1;
    }

    const baseContent =
      source.text ||
      (source.attachments?.length ? "Please analyze the attached file(s)." : "");
    request[index] = {
      role: source.role,
      content: omittedNames.length
        ? `${baseContent}\n[Attachment content not included: ${omittedNames.join(", ")}.]`
        : baseContent,
      ...(attachments.length ? { attachments } : {}),
    };
  }

  return request;
}

function isSavedChatConversation(
  value: unknown,
): value is SavedChatConversation {
  if (typeof value !== "object" || value === null) return false;
  return (
    "id" in value &&
    typeof value.id === "string" &&
    "title" in value &&
    typeof value.title === "string" &&
    "messages" in value &&
    Array.isArray(value.messages) &&
    value.messages.every(isLocalMessage) &&
    "createdAt" in value &&
    typeof value.createdAt === "number" &&
    "updatedAt" in value &&
    typeof value.updatedAt === "number"
  );
}

function readStoredChatHistory(userId: string): StoredChatHistory {
  try {
    const saved = window.localStorage.getItem(
      getAccountStorageKey(CHAT_HISTORY_STORAGE_KEY, userId),
    );
    if (!saved) {
      return {
        conversations: [],
        activeConversationId: null,
        storageError: false,
      };
    }

    const parsed: unknown = JSON.parse(saved);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("conversations" in parsed) ||
      !Array.isArray(parsed.conversations)
    ) {
      return {
        conversations: [],
        activeConversationId: null,
        storageError: false,
      };
    }

    const conversations = parsed.conversations
      .filter(isSavedChatConversation)
      .sort((left, right) => right.updatedAt - left.updatedAt);
    const requestedActiveId =
      "activeConversationId" in parsed &&
      typeof parsed.activeConversationId === "string"
        ? parsed.activeConversationId
        : null;

    return {
      conversations,
      activeConversationId:
        requestedActiveId ?? conversations[0]?.id ?? null,
      storageError: false,
    };
  } catch {
    return {
      conversations: [],
      activeConversationId: null,
      storageError: true,
    };
  }
}

function createChatConversationId(): string {
  return typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function createChatTitle(message: string): string {
  const title = message.replace(/\s+/g, " ").trim();
  return title.length > 52 ? `${title.slice(0, 52).trimEnd()}…` : title;
}

type JournalTrade = {
  id: number;
  date: string;
  symbol: string;
  direction: "Long" | "Short";
  entryPrice: string;
  exitPrice: string;
  pnl: number;
  setup: string;
  notes: string;
};

type JournalDraft = Omit<JournalTrade, "id" | "pnl"> & { pnl: string };
type JournalStorageRead = { entries: JournalTrade[]; notice: string };

const JOURNAL_STORAGE_KEY = "v6-trader-assistance:journal-trades:v1";

const sampleJournalTrades: JournalTrade[] = [
  {
    id: 1,
    date: "2026-10-17",
    symbol: "NQ",
    direction: "Short",
    entryPrice: "21,562.25",
    exitPrice: "21,520.25",
    pnl: 420,
    setup: "Resistance rejection",
    notes: "Waited for the lower high before entry.",
  },
  {
    id: 2,
    date: "2026-10-16",
    symbol: "ES",
    direction: "Long",
    entryPrice: "5,982.50",
    exitPrice: "5,988.25",
    pnl: 285,
    setup: "Opening range reclaim",
    notes: "Scaled out into the prior session high.",
  },
  {
    id: 3,
    date: "2026-10-15",
    symbol: "YM",
    direction: "Long",
    entryPrice: "43,310",
    exitPrice: "43,292",
    pnl: -180,
    setup: "Support bounce",
    notes: "Stopped after the level failed to hold.",
  },
  {
    id: 4,
    date: "2026-10-14",
    symbol: "NQ",
    direction: "Short",
    entryPrice: "21,608.50",
    exitPrice: "21,544.50",
    pnl: 640,
    setup: "Failed breakout",
    notes: "Good patience; entry followed the retest.",
  },
  {
    id: 5,
    date: "2026-10-13",
    symbol: "ES",
    direction: "Short",
    entryPrice: "5,996.75",
    exitPrice: "5,998.65",
    pnl: -95,
    setup: "VWAP rejection",
    notes: "Entered before confirmation; review sizing.",
  },
];

function isJournalTrade(value: unknown): value is JournalTrade {
  if (!value || typeof value !== "object") return false;
  const trade = value as Record<string, unknown>;
  return (
    typeof trade.id === "number" &&
    Number.isSafeInteger(trade.id) &&
    trade.id > 0 &&
    typeof trade.date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(trade.date) &&
    !Number.isNaN(Date.parse(`${trade.date}T12:00:00`)) &&
    ["NQ", "ES", "YM"].includes(String(trade.symbol)) &&
    (trade.direction === "Long" || trade.direction === "Short") &&
    typeof trade.entryPrice === "string" &&
    typeof trade.exitPrice === "string" &&
    typeof trade.pnl === "number" &&
    Number.isFinite(trade.pnl) &&
    typeof trade.setup === "string" &&
    typeof trade.notes === "string"
  );
}

function readStoredJournalTrades(userId: string): JournalStorageRead {
  if (typeof window === "undefined") return { entries: [], notice: "" };

  try {
    const raw = window.localStorage.getItem(
      getAccountStorageKey(JOURNAL_STORAGE_KEY, userId),
    );
    if (!raw) return { entries: [], notice: "" };

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return {
        entries: [],
        notice:
          "Saved entries could not be read. The built-in sample trades are still available.",
      };
    }

    const uniqueEntries = new Map<number, JournalTrade>();
    let skippedCount = 0;
    for (const item of parsed) {
      if (!isJournalTrade(item) || uniqueEntries.has(item.id)) {
        skippedCount += 1;
        continue;
      }
      uniqueEntries.set(item.id, item);
    }

    return {
      entries: [...uniqueEntries.values()].sort((a, b) => b.id - a.id),
      notice: skippedCount
        ? `${skippedCount} saved journal ${skippedCount === 1 ? "entry was" : "entries were"} skipped because the data was incomplete.`
        : "",
    };
  } catch {
    return {
      entries: [],
      notice:
        "Saved entries could not be read from this browser. The built-in sample trades are still available.",
    };
  }
}

const emptyJournalDraft = (): JournalDraft => ({
  date: new Date().toISOString().slice(0, 10),
  symbol: "NQ",
  direction: "Long",
  entryPrice: "",
  exitPrice: "",
  pnl: "",
  setup: "",
  notes: "",
});

const primaryNavigation = [
  { name: "Chat", icon: MessageCircle },
  { name: "Market Analysis", icon: Activity },
  { name: "Chart Analysis", icon: ChartNoAxesCombined },
  { name: "Trade Journal", icon: BookOpen },
  { name: "Strategies & Code", icon: Code2 },
  { name: "News & Research", icon: Newspaper },
  { name: "Education", icon: GraduationCap },
  { name: "Backtesting", icon: TrendingUp },
  { name: "Settings", icon: Settings },
];

const workspaces = [
  { name: "Futures Trading", icon: Activity },
  { name: "My Journal", icon: BookOpen },
  { name: "Strategy Development", icon: Code2 },
  { name: "Learning Hub", icon: GraduationCap },
  { name: "All Workspaces", icon: Layers3 },
];

const allWorkspaceItems = [
  { name: "Dashboard", icon: <Activity size={15} strokeWidth={1.8} /> },
  ...primaryNavigation.map(({ name, icon: Icon }) => ({
    name,
    icon: <Icon size={15} strokeWidth={1.8} />,
  })),
];

const quickActions = [
  { name: "Analyze Chart", icon: ChartNoAxesCombined },
  { name: "Check Market News", icon: Newspaper },
  { name: "Open TradingView", icon: ArrowUpRight },
  { name: "View Journal", icon: BookOpen },
];

const quotes = {
  NQ: { price: "21,542.75", change: "+87.50 (+0.41%)", rising: true },
  ES: { price: "6,001.50", change: "+24.25 (+0.41%)", rising: true },
  YM: { price: "43,287", change: "+132 (+0.31%)", rising: true },
};

type SymbolCode = keyof typeof quotes;

const candles = [
  [21584, 21594, 21570, 21576],
  [21576, 21584, 21561, 21566],
  [21566, 21578, 21556, 21572],
  [21572, 21583, 21568, 21579],
  [21579, 21588, 21572, 21576],
  [21576, 21582, 21562, 21567],
  [21567, 21578, 21559, 21573],
  [21573, 21591, 21570, 21586],
  [21586, 21595, 21578, 21582],
  [21582, 21591, 21573, 21577],
  [21577, 21591, 21574, 21588],
  [21588, 21598, 21580, 21592],
  [21592, 21601, 21583, 21588],
  [21588, 21594, 21574, 21578],
  [21578, 21589, 21570, 21583],
  [21583, 21588, 21563, 21568],
  [21568, 21579, 21558, 21562],
  [21562, 21576, 21555, 21572],
  [21572, 21578, 21560, 21564],
  [21564, 21570, 21548, 21552],
  [21552, 21563, 21543, 21558],
  [21558, 21563, 21538, 21542],
  [21542, 21550, 21528, 21532],
  [21532, 21544, 21522, 21538],
  [21538, 21543, 21514, 21520],
  [21520, 21532, 21508, 21512],
  [21512, 21524, 21499, 21506],
  [21506, 21514, 21491, 21497],
  [21497, 21510, 21488, 21503],
  [21503, 21510, 21484, 21492],
  [21492, 21502, 21478, 21486],
];

const priceTicks = [21620, 21600, 21580, 21560, 21540, 21520, 21500, 21480];
const timeframes = ["1m", "5m", "15m", "1h", "4h", "D"] as const;
const chartTabs = ["Chart", "Indicators", "Drawing Tools"] as const;
const welcomePrompts = [
  "Analyze a chart",
  "Check the markets",
  "Help me learn",
  "Review my trades",
  "Build a strategy",
];
const composerPrompts = [
  "Explain this setup",
  "What’s the bigger picture (1h / 4h)?",
  "How should I adjust my plan?",
  "Backtest this strategy",
  "Help me write code",
];

function formatPriceY(price: number) {
  return 12 + ((21620 - price) / (21620 - 21460)) * 220;
}

function formatJournalCurrency(value: number) {
  const amount = Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${value < 0 ? "−" : "+"}$${amount}`;
}

function PriceChart({ timeframe }: { timeframe: string }) {
  return (
    <div
      className="chart-plot"
      role="img"
      aria-label={`Illustrative NQ candlestick chart, ${timeframe} timeframe`}
    >
      <div className="chart-price-axis" aria-hidden="true">
        {priceTicks.map((price) => (
          <span key={price}>{price.toLocaleString("en-US")}</span>
        ))}
      </div>
      <div className="chart-svg-wrap">
        <svg
          className="candlestick-chart"
          viewBox="0 0 360 244"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {priceTicks.map((price) => (
            <line
              key={`grid-${price}`}
              x1="0"
              x2="360"
              y1={formatPriceY(price)}
              y2={formatPriceY(price)}
              className="chart-grid-line"
            />
          ))}
          <rect
            x="0"
            y={formatPriceY(21580)}
            width="360"
            height={formatPriceY(21560) - formatPriceY(21580)}
            className="resistance-band"
          />
          <rect
            x="0"
            y={formatPriceY(21500)}
            width="360"
            height={formatPriceY(21480) - formatPriceY(21500)}
            className="support-band"
          />
          <line
            x1="0"
            x2="360"
            y1={formatPriceY(21542.75)}
            y2={formatPriceY(21542.75)}
            className="current-price-line"
          />
          {candles.map(([open, high, low, close], index) => {
            const x = 5 + index * 11.25;
            const rising = close >= open;
            const top = Math.min(formatPriceY(open), formatPriceY(close));
            const height = Math.max(
              3,
              Math.abs(formatPriceY(close) - formatPriceY(open)),
            );
            return (
              <g
                key={`candle-${index}`}
                className={rising ? "candle-up" : "candle-down"}
              >
                <line
                  x1={x + 2.5}
                  x2={x + 2.5}
                  y1={formatPriceY(high)}
                  y2={formatPriceY(low)}
                />
                <rect x={x} y={top} width="5" height={height} rx="1" />
              </g>
            );
          })}
        </svg>
        <span className="zone-label resistance-label">
          Resistance Zone
          <br />
          <strong>21,560 – 21,580</strong>
        </span>
        <span className="zone-label support-label">
          Support Zone
          <br />
          <strong>21,480 – 21,500</strong>
        </span>
        <span className="live-price-label">21,542.75</span>
      </div>
      <div className="chart-times" aria-hidden="true">
        <span>07:00</span>
        <span>08:00</span>
        <span>09:00</span>
        <span>10:00</span>
        <span>11:00</span>
        <span>12:00</span>
      </div>
    </div>
  );
}

type ChartWorkspaceProps = {
  selectedSymbol: SymbolCode;
  onSymbolChange: (symbol: SymbolCode) => void;
  selectedTimeframe: (typeof timeframes)[number];
  onTimeframeChange: (timeframe: (typeof timeframes)[number]) => void;
  selectedChartTab: (typeof chartTabs)[number];
  onChartTabChange: (tab: (typeof chartTabs)[number]) => void;
  onNotify: (message: string) => void;
  focused?: boolean;
};

function ChartWorkspace({
  selectedSymbol,
  onSymbolChange,
  selectedTimeframe,
  onTimeframeChange,
  selectedChartTab,
  onChartTabChange,
  onNotify,
  focused = false,
}: ChartWorkspaceProps) {
  return (
    <section
      className={`right-card chart-card${focused ? " chart-card-focused" : ""}`}
      id="market-chart"
    >
      <div className="chart-tab-bar" role="tablist" aria-label="Chart tools">
        {chartTabs.map((tab) => (
          <button
            className={
              selectedChartTab === tab
                ? "chart-tab chart-tab-active"
                : "chart-tab"
            }
            key={tab}
            role="tab"
            aria-selected={selectedChartTab === tab}
            onClick={() => onChartTabChange(tab)}
            data-testid={`tab-${tab.toLowerCase().replaceAll(" ", "-")}`}
          >
            {tab}
          </button>
        ))}
        <button
          className="chart-expand"
          aria-label="Chart options"
          onClick={() => onNotify("Chart controls are sample-only.")}
          data-testid="button-chart-options"
        >
          <MoreHorizontal size={15} />
        </button>
      </div>
      <div className="chart-toolbar">
        <label className="symbol-select">
          <span className="symbol-icon">
            <Activity size={12} />
          </span>
          <select
            aria-label="Chart symbol"
            value={selectedSymbol}
            onChange={(event) =>
              onSymbolChange(event.target.value as SymbolCode)
            }
            data-testid="select-chart-symbol"
          >
            <option value="NQ">NQ 06-25</option>
            <option value="ES">ES 06-25</option>
            <option value="YM">YM 06-25</option>
          </select>
          <ChevronDown size={12} />
        </label>
        <button
          className="chart-toolbar-button"
          aria-label="Add indicator"
          onClick={() => onChartTabChange("Indicators")}
          data-testid="button-add-indicator"
        >
          <Plus size={14} />
        </button>
      </div>
      <div className="timeframe-list" aria-label="Chart timeframes">
        {timeframes.map((timeframe) => (
          <button
            className={
              selectedTimeframe === timeframe
                ? "timeframe-option timeframe-active"
                : "timeframe-option"
            }
            key={timeframe}
            onClick={() => onTimeframeChange(timeframe)}
            data-testid={`timeframe-${timeframe}`}
          >
            {timeframe}
          </button>
        ))}
        <button
          className="timeframe-more"
          aria-label="More timeframes"
          onClick={() =>
            onNotify("More timeframes are not enabled in the demo.")
          }
          data-testid="button-more-timeframes"
        >
          <MoreHorizontal size={13} />
        </button>
      </div>

      {selectedChartTab === "Chart" ? (
        <div className="chart-body">
          <div className="chart-instrument-title">
            <span>
              {selectedSymbol} · {selectedTimeframe}
            </span>
            <small>
              <span className="status-dot" /> Sample
            </small>
          </div>
          <PriceChart timeframe={selectedTimeframe} />
        </div>
      ) : selectedChartTab === "Indicators" ? (
        <div className="chart-tool-panel">
          <h3>Indicators</h3>
          <p>Illustrative overlays for this sample chart</p>
          <div className="indicator-row">
            <span className="indicator-swatch violet-swatch" /> EMA 20{" "}
            <b>21,537.25</b>
            <Check size={13} />
          </div>
          <div className="indicator-row">
            <span className="indicator-swatch teal-swatch" /> VWAP{" "}
            <b>21,519.50</b>
            <Check size={13} />
          </div>
          <div className="indicator-row">
            <span className="indicator-swatch amber-swatch" /> RSI 14{" "}
            <b>42.8</b>
            <Check size={13} />
          </div>
        </div>
      ) : (
        <div className="chart-tool-panel drawing-panel">
          <h3>Drawing tools</h3>
          <p>Choose a tool to preview it on the sample chart</p>
          <div className="drawing-tools">
            {["Cursor", "Trend line", "Horizontal level", "Text note"].map(
              (tool) => (
                <button
                  key={tool}
                  onClick={() =>
                    onNotify(`${tool} selected for the sample chart.`)
                  }
                  data-testid={`drawing-${tool.toLowerCase().replaceAll(" ", "-")}`}
                >
                  <CrosshairIcon /> {tool}
                </button>
              ),
            )}
          </div>
        </div>
      )}

      <div className="chart-legend">
        {timeframes.slice(0, 4).map((frame) => (
          <span key={frame}>
            {frame === "1m"
              ? "07:00"
              : frame === "5m"
                ? "08:00"
                : frame === "15m"
                  ? "09:00"
                  : "10:00"}
          </span>
        ))}
        <span>11:00</span>
        <span>12:00</span>
      </div>
    </section>
  );
}

function App({
  userId,
  initialSection,
  onLogout,
}: {
  userId: string;
  initialSection?: string;
  onLogout: () => void;
}) {
  const [activeNavigation, setActiveNavigation] = useState("Chat");
  const [isDedicatedChatOpen, setIsDedicatedChatOpen] = useState(false);
  const [isTradeJournalOpen, setIsTradeJournalOpen] = useState(false);
  const [isChartAnalysisOpen, setIsChartAnalysisOpen] = useState(false);
  const [isBacktestingOpen, setIsBacktestingOpen] = useState(false);
  const [isStrategiesOpen, setIsStrategiesOpen] = useState(false);
  const [isEducationOpen, setIsEducationOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAllWorkspacesOpen, setIsAllWorkspacesOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [strategyStorageRead] = useState(() => readStoredStrategies(userId));
  const [strategies, setStrategies] = useState<SavedStrategy[]>(
    strategyStorageRead.strategies,
  );
  const [strategyStorageNotice, setStrategyStorageNotice] = useState(
    strategyStorageRead.notice,
  );
  const [selectedStrategyId, setSelectedStrategyId] = useState(
    strategyStorageRead.strategies[0]?.id ?? "",
  );
  const [selectedWorkspace, setSelectedWorkspace] = useState("Futures Trading");
  const [selectedSymbol, setSelectedSymbol] = useState<SymbolCode>("NQ");
  const [selectedTimeframe, setSelectedTimeframe] =
    useState<(typeof timeframes)[number]>("5m");
  const [selectedChartTab, setSelectedChartTab] =
    useState<(typeof chartTabs)[number]>("Chart");
  const [draft, setDraft] = useState("");
  const [chatHistoryRead] = useState(() => readStoredChatHistory(userId));
  const [chatConversations, setChatConversations] = useState(
    chatHistoryRead.conversations,
  );
  const [activeConversationId, setActiveConversationId] = useState(
    () => chatHistoryRead.activeConversationId ?? createChatConversationId(),
  );
  const [messages, setMessages] = useState<LocalMessage[]>(() => {
    return (
      chatHistoryRead.conversations.find(
        (conversation) =>
          conversation.id === chatHistoryRead.activeConversationId,
      )?.messages ?? []
    );
  });
  const [isChatHistoryCollapsed, setIsChatHistoryCollapsed] = useState(
    () => window.matchMedia("(max-width: 600px)").matches,
  );
  const [chatHistoryStorageError, setChatHistoryStorageError] = useState(
    chatHistoryRead.storageError,
  );
  const [isSending, setIsSending] = useState(false);
  const [chatError, setChatError] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<
    LocalChatAttachment[]
  >([]);
  const [journalStorageRead] = useState(() => readStoredJournalTrades(userId));
  const [userJournalTrades, setUserJournalTrades] = useState(
    journalStorageRead.entries,
  );
  const [journalStorageNotice, setJournalStorageNotice] = useState(
    journalStorageRead.notice,
  );
  const [journalFilter, setJournalFilter] = useState<"All" | "Wins" | "Losses">(
    "All",
  );
  const [isJournalEntryFormOpen, setIsJournalEntryFormOpen] = useState(false);
  const [journalDraft, setJournalDraft] =
    useState<JournalDraft>(emptyJournalDraft);
  const [isProMode, setIsProMode] = useState(false);
  const [toast, setToast] = useState("");
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const profileButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const firstUserMessage = messages.find((message) => message.role === "user");
    if (!activeConversationId || !firstUserMessage) return;

    const updatedAt = Date.now();
    setChatConversations((current) => {
      const existing = current.find(
        (conversation) => conversation.id === activeConversationId,
      );
      const updatedConversation: SavedChatConversation = {
        id: activeConversationId,
        title: existing?.title || createChatTitle(firstUserMessage.text),
        messages,
        createdAt: existing?.createdAt ?? updatedAt,
        updatedAt,
      };
      return [
        updatedConversation,
        ...current.filter(
          (conversation) => conversation.id !== activeConversationId,
        ),
      ].sort((left, right) => right.updatedAt - left.updatedAt);
    });
  }, [activeConversationId, messages]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        getAccountStorageKey(CHAT_HISTORY_STORAGE_KEY, userId),
        JSON.stringify({
          version: 1,
          activeConversationId,
          conversations: chatConversations,
        }),
      );
      setChatHistoryStorageError(false);
    } catch {
      setChatHistoryStorageError(true);
    }
  }, [activeConversationId, chatConversations, userId]);

  useEffect(() => {
    if (!isProfileMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsProfileMenuOpen(false);
        profileButtonRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isProfileMenuOpen]);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  };

  const handleAttachmentSelection = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";
    if (files.length === 0) return;
    setChatError("");

    if (pendingAttachments.length + files.length > MAX_ATTACHMENTS_PER_MESSAGE) {
      setChatError("Attach no more than four files to one message.");
      return;
    }

    const prepared: PreparedChatAttachment[] = [];
    try {
      for (const file of files) {
        prepared.push(await prepareChatAttachment(file));
      }

      let totalBytes = prepared.reduce(
        (total, item) => total + item.stored.blob.size,
        0,
      );
      let documentChars = 0;
      for (const item of prepared) {
        if (
          item.stored.encoding === "text" &&
          item.attachment.kind === "document"
        ) {
          documentChars += (await item.stored.blob.text()).length;
        }
      }
      for (const attachment of pendingAttachments) {
        const stored = await readChatAttachment(attachment.id);
        if (!stored) continue;
        totalBytes += stored.blob.size;
        if (stored.encoding === "text" && attachment.kind === "document") {
          documentChars += (await stored.blob.text()).length;
        }
      }
      if (totalBytes > MAX_ATTACHMENT_BATCH_BYTES) {
        throw new Error("Keep attachments under 6 MB combined for one message.");
      }
      if (documentChars > MAX_DOCUMENT_CONTEXT_CHARS) {
        throw new Error("Document text exceeds the 40,000-character context limit.");
      }

      const storedIds: string[] = [];
      try {
        for (const item of prepared) {
          await storeChatAttachment(item.attachment.id, item.stored);
          storedIds.push(item.attachment.id);
        }
      } catch (error) {
        await deleteChatAttachments(storedIds);
        throw error;
      }
      setPendingAttachments((current) => [
        ...current,
        ...prepared.map((item) => item.attachment),
      ]);
    } catch (error) {
      setChatError(
        error instanceof Error
          ? error.message
          : "Could not prepare the selected attachments.",
      );
    }
  };

  const removePendingAttachment = (id: string) => {
    setPendingAttachments((current) =>
      current.filter((attachment) => attachment.id !== id),
    );
    void deleteChatAttachments([id]).catch(() =>
      setChatError("Could not remove the attachment from this message."),
    );
  };

  const clearPendingAttachments = () => {
    const ids = pendingAttachments.map((attachment) => attachment.id);
    setPendingAttachments([]);
    void deleteChatAttachments(ids).catch(() => {});
  };

  const focusComposer = (prompt?: string) => {
    if (prompt) setDraft(prompt);
    composerRef.current?.focus();
    document
      .getElementById("chat-composer")
      ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  const closeProfileMenu = (restoreFocus = false) => {
    setIsProfileMenuOpen(false);
    if (restoreFocus) profileButtonRef.current?.focus();
  };

  const closeWorkspaceViews = () => {
    setIsDedicatedChatOpen(false);
    setIsTradeJournalOpen(false);
    setIsChartAnalysisOpen(false);
    setIsBacktestingOpen(false);
    setIsStrategiesOpen(false);
    setIsEducationOpen(false);
    setIsSettingsOpen(false);
    setIsAllWorkspacesOpen(false);
    setIsAccountOpen(false);
    setIsJournalEntryFormOpen(false);
  };

  const openDedicatedChat = () => {
    closeWorkspaceViews();
    setActiveNavigation("Chat");
    setIsDedicatedChatOpen(true);
    window.requestAnimationFrame(() => composerRef.current?.focus());
  };

  const returnToDashboard = (workspace = "Futures Trading") => {
    closeWorkspaceViews();
    setActiveNavigation("Chat");
    setSelectedWorkspace(workspace);
  };

  const handleNavigation = (name: string) => {
    closeProfileMenu();
    setIsAllWorkspacesOpen(false);
    setIsAccountOpen(false);
    setActiveNavigation(name);
    const workspaceByNavigation: Record<string, string> = {
      Chat: "Futures Trading",
      "Market Analysis": "Futures Trading",
      "Chart Analysis": "Futures Trading",
      "Trade Journal": "My Journal",
      "Strategies & Code": "Strategy Development",
      Backtesting: "Strategy Development",
      "News & Research": "Futures Trading",
      Education: "Learning Hub",
    };
    if (workspaceByNavigation[name]) {
      setSelectedWorkspace(workspaceByNavigation[name]);
    }
    if (name === "News & Research") {
      window.open(
        "https://www.forexfactory.com/calendar/",
        "_blank",
        "noopener,noreferrer",
      );
      return;
    }
    setIsEducationOpen(name === "Education");
    setIsSettingsOpen(name === "Settings");
    setIsBacktestingOpen(name === "Backtesting");
    setIsStrategiesOpen(name === "Strategies & Code");

    if (name === "Chat") {
      openDedicatedChat();
      return;
    }
    setIsDedicatedChatOpen(false);
    setIsTradeJournalOpen(name === "Trade Journal");
    setIsChartAnalysisOpen(name === "Chart Analysis");
    if (
      name === "Chart Analysis" ||
      name === "Education" ||
      name === "Settings"
    ) {
      return;
    } else if (name === "Trade Journal") {
      setIsTradeJournalOpen(true);
    } else if (name === "Market Analysis") {
      window.requestAnimationFrame(() =>
        document
          .getElementById("market-overview")
          ?.scrollIntoView({ behavior: "smooth", block: "center" }),
      );
    } else if (name === "Backtesting" || name === "Strategies & Code") {
      return;
    } else {
      notify(`${name} is a local demo navigation item.`);
    }
  };

  useEffect(() => {
    if (initialSection) handleNavigation(initialSection);
  }, [initialSection]);

  const handleWorkspaceNavigation = (name: string) => {
    if (name === "Futures Trading") {
      returnToDashboard(name);
      return;
    }
    if (name === "All Workspaces") {
      closeWorkspaceViews();
      setSelectedWorkspace(name);
      setIsAllWorkspacesOpen(true);
      return;
    }

    const pageByWorkspace: Record<string, string> = {
      "My Journal": "Trade Journal",
      "Strategy Development": "Strategies & Code",
      "Learning Hub": "Education",
    };
    const destination = pageByWorkspace[name];
    if (!destination) {
      notify("This workspace is not available.");
      return;
    }

    handleNavigation(destination);
    setSelectedWorkspace(name);
  };

  const openAccountPlaceholder = () => {
    closeProfileMenu(true);
    returnToDashboard("Futures Trading");
    setIsAccountOpen(true);
  };

  const handleLogout = () => {
    closeProfileMenu();
    returnToDashboard("Futures Trading");
    onLogout();
  };

  const updateStrategies = (nextStrategies: SavedStrategy[]) => {
    setStrategies(nextStrategies);
    const notice = persistStrategies(nextStrategies, userId);
    setStrategyStorageNotice(notice ?? "");
    if (
      !nextStrategies.some((strategy) => strategy.id === selectedStrategyId)
    ) {
      setSelectedStrategyId(nextStrategies[0]?.id ?? "");
    }
    return notice;
  };

  const addJournalTrade = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trade: JournalTrade = {
      ...journalDraft,
      id: Math.max(
        Date.now(),
        ...userJournalTrades.map((entry) => entry.id + 1),
      ),
      pnl: Number(journalDraft.pnl),
    };
    const nextUserTrades = [trade, ...userJournalTrades];
    setUserJournalTrades(nextUserTrades);
    try {
      window.localStorage.setItem(
        getAccountStorageKey(JOURNAL_STORAGE_KEY, userId),
        JSON.stringify(nextUserTrades),
      );
      setJournalStorageNotice(
        "Your journal entries are saved in this browser.",
      );
    } catch {
      setJournalStorageNotice(
        "This browser could not save the entry. It will remain available until you leave this page.",
      );
    }
    setJournalFilter("All");
    setJournalDraft(emptyJournalDraft());
    setIsJournalEntryFormOpen(false);
    notify("Trade added to your local demo journal.");
  };

  const startNewChat = () => {
    if (isSending) return;
    clearPendingAttachments();
    setActiveConversationId(createChatConversationId());
    setMessages([]);
    setDraft("");
    setChatError("");
    if (window.matchMedia("(max-width: 600px)").matches) {
      setIsChatHistoryCollapsed(true);
    }
  };

  const openChatConversation = (conversationId: string) => {
    if (isSending || conversationId === activeConversationId) return;
    const conversation = chatConversations.find(
      (item) => item.id === conversationId,
    );
    if (!conversation) return;

    clearPendingAttachments();
    setActiveConversationId(conversation.id);
    setMessages(conversation.messages);
    setDraft("");
    setChatError("");
    if (window.matchMedia("(max-width: 600px)").matches) {
      setIsChatHistoryCollapsed(true);
    }
  };

  const renameChatConversation = (conversationId: string) => {
    if (isSending) return;
    const conversation = chatConversations.find(
      (item) => item.id === conversationId,
    );
    if (!conversation) return;

    const requestedTitle = window.prompt(
      "Rename conversation",
      conversation.title,
    );
    const title = requestedTitle?.trim();
    if (!title) return;

    setChatConversations((current) =>
      current.map((item) =>
        item.id === conversationId ? { ...item, title } : item,
      ),
    );
  };

  const deleteChatConversation = (conversationId: string) => {
    if (isSending) return;
    const conversation = chatConversations.find(
      (item) => item.id === conversationId,
    );
    if (!conversation) return;
    if (
      !window.confirm(
        `Delete “${conversation.title}”? This conversation cannot be recovered.`,
      )
    ) {
      return;
    }

    setChatConversations((current) =>
      current.filter((item) => item.id !== conversationId),
    );
    void deleteChatAttachments(
      conversation.messages.flatMap((message) =>
        (message.attachments ?? []).map((attachment) => attachment.id),
      ),
    ).catch(() =>
      setChatError("Could not remove all files from the deleted conversation."),
    );
    if (conversationId === activeConversationId) {
      clearPendingAttachments();
      setActiveConversationId(createChatConversationId());
      setMessages([]);
      setDraft("");
      setChatError("");
    }
  };

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = draft.trim();
    if ((!text && pendingAttachments.length === 0) || text.length > 1000 || isSending) {
      return;
    }

    const userMessage: LocalMessage = {
      id: Date.now(),
      role: "user",
      text,
      ...(pendingAttachments.length ? { attachments: pendingAttachments } : {}),
    };

    setChatError("");
    setIsSending(true);
    try {
      const requestMessages: ChatInput = {
        messages: await createChatRequestHistory([...messages, userMessage]),
      };
      const response = await fetch("/api/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestMessages),
      });

      let result: unknown;
      try {
        result = await response.json();
      } catch {
        throw new Error(
          "V6 could not read the server response. Please try again.",
        );
      }

      if (!response.ok) {
        const message =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "V6 could not complete the request. Please try again.";
        throw new Error(message);
      }

      const reply =
        typeof result === "object" &&
        result !== null &&
        "reply" in result &&
        typeof result.reply === "string"
          ? result.reply.trim()
          : "";
      if (!reply) {
        throw new Error(
          "V6 returned an empty response. Please try sending your message again.",
        );
      }

      const truncatedAttachmentIds = new Set<string>();
      if (
        typeof result === "object" &&
        result !== null &&
        "processedAttachments" in result &&
        Array.isArray(result.processedAttachments)
      ) {
        for (const item of result.processedAttachments) {
          if (
            typeof item === "object" &&
            item !== null &&
            "id" in item &&
            typeof item.id === "string" &&
            "text" in item &&
            typeof item.text === "string"
          ) {
            try {
              await storeChatAttachment(item.id, {
                blob: new Blob([item.text], { type: "text/plain;charset=utf-8" }),
                encoding: "text",
              });
              if ("truncated" in item && item.truncated === true) {
                truncatedAttachmentIds.add(item.id);
              }
            } catch {
              setChatError(
                "V6 replied, but the PDF text could not be saved for follow-ups. You may need to attach it again.",
              );
            }
          }
        }
      }

      setMessages((current) => [
        ...current.map((message) => ({
          ...message,
          attachments: message.attachments?.map((attachment) =>
            truncatedAttachmentIds.has(attachment.id)
              ? { ...attachment, truncated: true }
              : attachment,
          ),
        })),
        {
          ...userMessage,
          attachments: userMessage.attachments?.map((attachment) =>
            truncatedAttachmentIds.has(attachment.id)
              ? { ...attachment, truncated: true }
              : attachment,
          ),
        },
        { id: Date.now() + 1, role: "assistant", text: reply },
      ]);
      setPendingAttachments([]);
      setDraft("");
    } catch (error) {
      setChatError(
        error instanceof TypeError
          ? "Could not connect to V6. Check your connection and try again."
          : error instanceof Error
            ? error.message
            : "V6 could not complete the request. Please try again.",
      );
    } finally {
      setIsSending(false);
    }
  };

  const submitOnEnter = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      const form = event.currentTarget.form;
      form?.requestSubmit();
    }
  };

  const runQuickAction = (action: string) => {
    if (action === "Analyze Chart") {
      handleNavigation("Chart Analysis");
    } else if (action === "Check Market News") {
      handleNavigation("News & Research");
    } else if (action === "View Journal") {
      handleNavigation("Trade Journal");
    } else if (action === "Open TradingView") {
      window.open(
        "https://www.tradingview.com/markets",
        "_blank",
        "noopener,noreferrer",
      );
    } else {
      notify("This action is not available yet.");
    }
  };

  const activeQuote = quotes[selectedSymbol];
  const journalTrades = [...userJournalTrades, ...sampleJournalTrades];
  const journalWins = journalTrades.filter((trade) => trade.pnl > 0);
  const journalLosses = journalTrades.filter((trade) => trade.pnl <= 0);
  const journalTotalPnl = journalTrades.reduce(
    (total, trade) => total + trade.pnl,
    0,
  );
  const visibleJournalTrades = journalTrades.filter(
    (trade) =>
      journalFilter === "All" ||
      (journalFilter === "Wins" ? trade.pnl > 0 : trade.pnl <= 0),
  );
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-brand">
          <div className="brand-v6">V6</div>
          <div className="brand-copy">
            <strong>V6 TRADER ASSISTANCE</strong>
            <span>ANALYZE / LEARN / TRADE / GROW</span>
          </div>
        </div>

        <div className="market-ticker">
          <div className="market-data-status">
            <span className="status-dot" />
            <div>
              <strong>SIMULATED MARKET DATA</strong>
              <span>4:37:17 PM ET</span>
            </div>
          </div>
          {(Object.keys(quotes) as SymbolCode[]).map((symbol) => (
            <button
              className={`ticker-quote ${selectedSymbol === symbol ? "ticker-selected" : ""}`}
              key={symbol}
              onClick={() => setSelectedSymbol(symbol)}
              data-testid={`ticker-${symbol.toLowerCase()}`}
            >
              <span>
                {symbol} <strong>{quotes[symbol].price}</strong>
              </span>
              <small>
                <ArrowUpRight size={11} /> {quotes[symbol].change}
              </small>
            </button>
          ))}
        </div>

        <div className="topbar-actions">
          <button
            className={`pro-button ${isProMode ? "pro-button-active" : ""}`}
            onClick={() => setIsProMode((value) => !value)}
            data-testid="button-pro-mode"
          >
            <Sparkles size={13} /> {isProMode ? "Pro Mode On" : "Pro Mode"}
          </button>
          <button
            className="icon-button notification-button"
            aria-label="Notifications"
            onClick={() => notify("No new notifications in this demo.")}
            data-testid="button-notifications"
          >
            <Bell size={16} />
            <span className="notification-dot" />
          </button>
          <div className="profile-menu-container" ref={profileMenuRef}>
            <button
              ref={profileButtonRef}
              className="profile-avatar"
              aria-label="Open profile menu"
              aria-haspopup="menu"
              aria-expanded={isProfileMenuOpen}
              aria-controls="profile-actions-menu"
              onClick={() => setIsProfileMenuOpen((open) => !open)}
              data-testid="button-profile"
            >
              <UserRound size={14} aria-hidden="true" />
            </button>
            <div
              id="profile-actions-menu"
              className="profile-menu"
              role="menu"
              aria-label="Profile and account actions"
              hidden={!isProfileMenuOpen}
              data-testid="profile-menu"
            >
              <div className="profile-menu-heading">PROFILE</div>
              <button
                type="button"
                className="profile-menu-item"
                role="menuitem"
                onClick={openAccountPlaceholder}
                data-testid="profile-menu-account"
              >
                <UserRound size={14} />
                <span>Account</span>
              </button>
              <button
                type="button"
                className="profile-menu-item"
                role="menuitem"
                onClick={() => {
                  closeProfileMenu(true);
                  handleNavigation("Settings");
                }}
                data-testid="profile-menu-settings"
              >
                <Settings size={14} />
                <span>Settings</span>
              </button>
              <div className="profile-menu-divider" />
              <button
                type="button"
                className="profile-menu-item"
                role="menuitem"
                onClick={handleLogout}
                data-testid="profile-menu-logout"
              >
                <LogOut size={14} />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <aside className="sidebar" aria-label="Main navigation">
        <button
          className="new-chat-button"
          onClick={() => {
            startNewChat();
            openDedicatedChat();
          }}
          disabled={isSending}
          data-testid="button-new-chat"
        >
          <Plus size={16} /> <span>New Chat</span>
        </button>

        <nav className="primary-navigation">
          {primaryNavigation.map(({ name, icon: Icon }) => (
            <button
              className={`navigation-item ${activeNavigation === name ? "navigation-active" : ""}`}
              key={name}
              onClick={() => handleNavigation(name)}
              data-testid={`nav-${name.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`}
            >
              <Icon size={15} strokeWidth={1.8} />
              <span>{name}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-group">
          <div className="sidebar-label">WORKSPACES</div>
          <button
            className="sidebar-add"
            aria-label="Add workspace"
            onClick={() =>
              notify("Workspace creation is not enabled in this demo.")
            }
            data-testid="button-add-workspace"
          >
            <Plus size={13} />
          </button>
          <div className="workspace-list">
            {workspaces.map(({ name, icon: Icon }) => (
              <button
                key={name}
                className={`workspace-item ${selectedWorkspace === name ? "workspace-active" : ""}`}
                onClick={() => handleWorkspaceNavigation(name)}
                data-testid={`workspace-${name.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`}
              >
                <Icon size={14} />
                <span>{name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="sidebar-group quick-group">
          <div className="sidebar-label">QUICK ACTIONS</div>
          <div className="quick-action-list">
            {quickActions.map(({ name, icon: Icon }) => (
              <button
                key={name}
                className="quick-action"
                onClick={() => runQuickAction(name)}
                data-testid={`quick-${name.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`}
              >
                <Icon size={15} />
                <span>{name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="sidebar-mantra">
          BETTER
          <br />
          DECISIONS
          <br />
          BIGGER
          <br />
          OPPORTUNITIES.
          <div className="sidebar-watermark">V6</div>
        </div>
      </aside>

      <main
        className={`main-area${isDedicatedChatOpen || isTradeJournalOpen || isChartAnalysisOpen || isBacktestingOpen || isStrategiesOpen || isAllWorkspacesOpen || isAccountOpen ? " dedicated-chat-mode" : ""}${isChartAnalysisOpen ? " chart-analysis-mode" : ""}${isAllWorkspacesOpen ? " all-workspaces-mode" : ""}${isAccountOpen ? " account-mode" : ""}`}
      >
        {isTradeJournalOpen ? (
          <section className="journal-workspace" aria-label="Trade Journal">
            <header className="dedicated-chat-header">
              <div className="dedicated-chat-identity">
                <div className="analysis-logo">
                  <BookOpen size={15} />
                </div>
                <div>
                  <h1>Trade Journal</h1>
                  <p>Personal trade log · Local browser demo</p>
                </div>
              </div>
              <button
                className="return-dashboard-button"
                onClick={() => returnToDashboard()}
                data-testid="button-journal-back-to-dashboard"
              >
                <ArrowLeft size={14} />
                <span>Back to Dashboard</span>
              </button>
            </header>

            <div className="journal-workspace-content">
              <div className="journal-page-heading">
                <div>
                  <h2>Your trading journal</h2>
                  <p>
                    Review the decisions behind each trade and keep a record of
                    your process.
                  </p>
                </div>
                <button
                  className="journal-add-button"
                  onClick={() => {
                    setJournalDraft(emptyJournalDraft());
                    setIsJournalEntryFormOpen((open) => !open);
                  }}
                  data-testid="button-add-journal-trade"
                >
                  <Plus size={14} />
                  <span>
                    {isJournalEntryFormOpen ? "Close form" : "Log a trade"}
                  </span>
                </button>
              </div>

              {journalStorageNotice && (
                <p className="journal-storage-notice" role="status">
                  {journalStorageNotice}
                </p>
              )}

              {isJournalEntryFormOpen && (
                <form
                  className="journal-entry-form"
                  onSubmit={addJournalTrade}
                  data-testid="form-journal-trade"
                >
                  <div className="journal-form-heading">
                    <div>
                      <h3>New journal entry</h3>
                      <p>Saved in this browser demo only.</p>
                    </div>
                    <button
                      type="button"
                      className="journal-cancel-button"
                      onClick={() => setIsJournalEntryFormOpen(false)}
                      data-testid="button-cancel-journal-trade"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="journal-form-grid">
                    <label>
                      Date
                      <input
                        type="date"
                        value={journalDraft.date}
                        onChange={(event) =>
                          setJournalDraft((draft) => ({
                            ...draft,
                            date: event.target.value,
                          }))
                        }
                        required
                        data-testid="input-journal-date"
                      />
                    </label>
                    <label>
                      Symbol
                      <select
                        value={journalDraft.symbol}
                        onChange={(event) =>
                          setJournalDraft((draft) => ({
                            ...draft,
                            symbol: event.target.value,
                          }))
                        }
                        data-testid="select-journal-symbol"
                      >
                        <option>NQ</option>
                        <option>ES</option>
                        <option>YM</option>
                      </select>
                    </label>
                    <label>
                      Side
                      <select
                        value={journalDraft.direction}
                        onChange={(event) =>
                          setJournalDraft((draft) => ({
                            ...draft,
                            direction: event.target
                              .value as JournalTrade["direction"],
                          }))
                        }
                        data-testid="select-journal-side"
                      >
                        <option>Long</option>
                        <option>Short</option>
                      </select>
                    </label>
                    <label>
                      Entry price
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={journalDraft.entryPrice}
                        onChange={(event) =>
                          setJournalDraft((draft) => ({
                            ...draft,
                            entryPrice: event.target.value,
                          }))
                        }
                        placeholder="0.00"
                        required
                        data-testid="input-journal-entry-price"
                      />
                    </label>
                    <label>
                      Exit price
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={journalDraft.exitPrice}
                        onChange={(event) =>
                          setJournalDraft((draft) => ({
                            ...draft,
                            exitPrice: event.target.value,
                          }))
                        }
                        placeholder="0.00"
                        required
                        data-testid="input-journal-exit-price"
                      />
                    </label>
                    <label>
                      Net P&amp;L ($)
                      <input
                        type="number"
                        step="0.01"
                        value={journalDraft.pnl}
                        onChange={(event) =>
                          setJournalDraft((draft) => ({
                            ...draft,
                            pnl: event.target.value,
                          }))
                        }
                        placeholder="e.g. 125 or -50"
                        required
                        data-testid="input-journal-pnl"
                      />
                    </label>
                    <label className="journal-form-wide">
                      Setup
                      <input
                        value={journalDraft.setup}
                        onChange={(event) =>
                          setJournalDraft((draft) => ({
                            ...draft,
                            setup: event.target.value,
                          }))
                        }
                        placeholder="e.g. Opening range breakout"
                        required
                        data-testid="input-journal-setup"
                      />
                    </label>
                    <label className="journal-form-wide">
                      Notes
                      <textarea
                        value={journalDraft.notes}
                        onChange={(event) =>
                          setJournalDraft((draft) => ({
                            ...draft,
                            notes: event.target.value,
                          }))
                        }
                        placeholder="What went well? What would you change?"
                        rows={2}
                        data-testid="input-journal-notes"
                      />
                    </label>
                  </div>
                  <div className="journal-form-actions">
                    <span>
                      Local demo · No brokerage or market service connected
                    </span>
                    <button
                      className="journal-save-button"
                      type="submit"
                      data-testid="button-save-journal-trade"
                    >
                      <Check size={13} />
                      Save entry
                    </button>
                  </div>
                </form>
              )}

              <div className="journal-stats-grid" aria-label="Journal summary">
                <article className="journal-stat-card">
                  <span>
                    <CircleDollarSign size={13} /> Net P&amp;L
                  </span>
                  <strong
                    className={
                      journalTotalPnl >= 0
                        ? "journal-positive"
                        : "journal-negative"
                    }
                  >
                    {formatJournalCurrency(journalTotalPnl)}
                  </strong>
                  <small>Across sample and saved trades</small>
                </article>
                <article className="journal-stat-card">
                  <span>
                    <TrendingUp size={13} /> Win rate
                  </span>
                  <strong>
                    {journalTrades.length
                      ? `${Math.round((journalWins.length / journalTrades.length) * 100)}%`
                      : "—"}
                  </strong>
                  <small>{journalWins.length} winning trades</small>
                </article>
                <article className="journal-stat-card">
                  <span>
                    <BookOpen size={13} /> Trades logged
                  </span>
                  <strong>{journalTrades.length}</strong>
                  <small>Local journal entries</small>
                </article>
                <article className="journal-stat-card">
                  <span>
                    <CalendarDays size={13} /> Average winner
                  </span>
                  <strong className="journal-positive">
                    {formatJournalCurrency(
                      journalWins.length
                        ? journalWins.reduce(
                            (total, trade) => total + trade.pnl,
                            0,
                          ) / journalWins.length
                        : 0,
                    )}
                  </strong>
                  <small>Per profitable trade</small>
                </article>
              </div>

              <section
                className="journal-history-card"
                aria-label="Trade history"
              >
                <div className="journal-history-heading">
                  <div>
                    <h3>Trade history</h3>
                    <p>Built-in examples and your saved entries</p>
                  </div>
                  <div
                    className="journal-filter-list"
                    role="group"
                    aria-label="Filter trades"
                  >
                    {(["All", "Wins", "Losses"] as const).map((filter) => (
                      <button
                        key={filter}
                        className={
                          journalFilter === filter
                            ? "journal-filter-active"
                            : ""
                        }
                        onClick={() => setJournalFilter(filter)}
                        aria-pressed={journalFilter === filter}
                        data-testid={`filter-journal-${filter.toLowerCase()}`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="journal-table-scroll">
                  <table className="journal-trade-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Trade</th>
                        <th>Entry / Exit</th>
                        <th>Setup &amp; notes</th>
                        <th>Net P&amp;L</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleJournalTrades.map((trade) => (
                        <tr
                          key={trade.id}
                          data-testid={`journal-trade-${trade.id}`}
                        >
                          <td className="journal-date-cell">
                            {new Date(
                              `${trade.date}T12:00:00`,
                            ).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </td>
                          <td>
                            <span className="journal-symbol">
                              {trade.symbol}
                            </span>
                            <span
                              className={`journal-direction ${trade.direction === "Long" ? "journal-long" : "journal-short"}`}
                            >
                              {trade.direction}
                            </span>
                          </td>
                          <td>
                            <span>{trade.entryPrice}</span>
                            <small>{trade.exitPrice}</small>
                          </td>
                          <td>
                            <strong className="journal-setup">
                              {trade.setup}
                            </strong>
                            {trade.notes && (
                              <small className="journal-notes">
                                {trade.notes}
                              </small>
                            )}
                          </td>
                          <td
                            className={
                              trade.pnl >= 0
                                ? "journal-positive"
                                : "journal-negative"
                            }
                          >
                            {formatJournalCurrency(trade.pnl)}
                          </td>
                        </tr>
                      ))}
                      {visibleJournalTrades.length === 0 && (
                        <tr>
                          <td className="journal-empty-row" colSpan={5}>
                            No trades in this filter yet. Log a trade to add one
                            to your journal.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <p className="journal-disclaimer">
                  Built-in examples stay separate from your entries. Added
                  trades are saved in this browser only · Not financial advice
                </p>
              </section>
            </div>
          </section>
        ) : isAllWorkspacesOpen ? (
          <AllWorkspacesPage
            items={allWorkspaceItems}
            onOpen={(name) => {
              if (name === "Dashboard") {
                returnToDashboard("Futures Trading");
                return;
              }
              handleNavigation(name);
            }}
            onBack={() => returnToDashboard("Futures Trading")}
          />
        ) : isAccountOpen ? (
          <section
            className="profile-account-view"
            aria-label="Account"
            data-testid="profile-account-view"
          >
            <header className="dedicated-chat-header">
              <div className="dedicated-chat-identity">
                <div className="analysis-logo">
                  <UserRound size={15} />
                </div>
                <div>
                  <h1>Account</h1>
                  <p>Account information</p>
                </div>
              </div>
              <button
                className="return-dashboard-button"
                onClick={() => returnToDashboard("Futures Trading")}
                data-testid="button-account-back-to-dashboard"
              >
                <ArrowLeft size={14} />
                <span>Back to Dashboard</span>
              </button>
            </header>
            <div className="profile-account-panel">
              <UserRound size={20} aria-hidden="true" />
              <h2>Account information isn’t connected</h2>
              <p>
                Account details aren’t available in this demo, so no personal
                profile information is shown here.
              </p>
            </div>
          </section>
        ) : isDedicatedChatOpen ? (
          <section className="dedicated-chat-view" aria-label="V6 AI Chat">
            <header className="dedicated-chat-header">
              <div className="dedicated-chat-identity">
                <div>
                  <h1>V6 AI Chat</h1>
                  <p>OpenRouter free-model chat · No live market data</p>
                </div>
              </div>
              <div className="chat-header-actions">
                <button
                  className="chat-history-toggle"
                  type="button"
                  onClick={() =>
                    setIsChatHistoryCollapsed((collapsed) => !collapsed)
                  }
                  aria-controls="chat-history-sidebar"
                  aria-expanded={!isChatHistoryCollapsed}
                  aria-label={
                    isChatHistoryCollapsed
                      ? "Show chat history"
                      : "Hide chat history"
                  }
                  data-testid="button-toggle-chat-history"
                >
                  {isChatHistoryCollapsed ? (
                    <PanelLeftOpen size={14} />
                  ) : (
                    <PanelLeftClose size={14} />
                  )}
                  <span>
                    {isChatHistoryCollapsed ? "Show history" : "Hide history"}
                  </span>
                </button>
                <button
                  className="return-dashboard-button"
                  onClick={() => returnToDashboard()}
                  data-testid="button-back-to-dashboard"
                >
                  <ArrowLeft size={14} />
                  <span>Back to Dashboard</span>
                </button>
              </div>
            </header>

            <div className="chat-workspace-body">
              {!isChatHistoryCollapsed && (
                <aside
                  className="chat-history-sidebar"
                  id="chat-history-sidebar"
                  aria-label="Chat history"
                  data-testid="chat-history-sidebar"
                >
                  <div className="chat-history-sidebar-heading">
                    <div>
                      <h2>Chat history</h2>
                      <p>Saved in this browser</p>
                    </div>
                    <button
                      className="chat-new-conversation"
                      type="button"
                      onClick={startNewChat}
                      disabled={isSending}
                      data-testid="button-history-new-chat"
                    >
                      <Plus size={13} />
                      <span>New Chat</span>
                    </button>
                  </div>
                  {chatHistoryStorageError && (
                    <p
                      className="chat-history-storage-error"
                      role="status"
                      data-testid="chat-history-storage-error"
                    >
                      Browser storage is unavailable; chats may not persist.
                    </p>
                  )}
                  <div className="chat-history-list">
                    {chatConversations.length === 0 ? (
                      <p className="chat-history-empty">
                        Your conversations will appear here.
                      </p>
                    ) : (
                      chatConversations.map((conversation) => (
                        <div
                          className={`chat-history-conversation${conversation.id === activeConversationId ? " is-active" : ""}`}
                          key={conversation.id}
                        >
                          <button
                            className="chat-history-select"
                            type="button"
                            onClick={() =>
                              openChatConversation(conversation.id)
                            }
                            aria-current={
                              conversation.id === activeConversationId
                                ? "page"
                                : undefined
                            }
                            disabled={isSending}
                            data-testid="button-history-select"
                          >
                            <span className="chat-history-title">
                              {conversation.title}
                            </span>
                            <time
                              dateTime={new Date(
                                conversation.updatedAt,
                              ).toISOString()}
                            >
                              {new Date(
                                conversation.updatedAt,
                              ).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                              })}
                            </time>
                          </button>
                          <div className="chat-history-actions">
                            <button
                              className="chat-history-action"
                              type="button"
                              onClick={() =>
                                renameChatConversation(conversation.id)
                              }
                              aria-label={`Rename ${conversation.title}`}
                              title="Rename conversation"
                              disabled={isSending}
                              data-testid="button-history-rename"
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              className="chat-history-action chat-history-delete"
                              type="button"
                              onClick={() =>
                                deleteChatConversation(conversation.id)
                              }
                              aria-label={`Delete ${conversation.title}`}
                              title="Delete conversation"
                              disabled={isSending}
                              data-testid="button-history-delete"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </aside>
              )}

              <div className="chat-conversation-area">
                <div className="dedicated-chat-history" aria-live="polite">
                  {messages.length === 0 ? (
                    <div className="dedicated-chat-empty">
                      <div className="dedicated-chat-empty-icon">
                        <Bot size={22} />
                      </div>
                      <h2>Start a conversation</h2>
                      <p>
                        Ask about a futures setup, market structure, or your
                        trading process. Responses are AI-generated educational
                        guidance; no live price or chart data is connected.
                      </p>
                      <div className="dedicated-chat-quick-prompts">
                        {welcomePrompts.slice(0, 3).map((prompt) => (
                          <button
                            key={prompt}
                            onClick={() => focusComposer(prompt)}
                            data-testid={`dedicated-${prompt.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`}
                          >
                            <Sparkles size={11} />
                            {prompt}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div
                        className={`followup-message ${message.role === "user" ? "followup-user" : "followup-assistant"}`}
                        key={message.id}
                        data-testid={`message-${message.role}-${message.id}`}
                      >
                        <div className="followup-bubble">
                          <strong>
                            {message.role === "user"
                              ? "You"
                              : "V6 Trader Assistance · local demo"}
                          </strong>
                          <p>
                            {message.text ||
                              (message.attachments?.length ? "Attached files" : "")}
                          </p>
                          <ChatAttachmentList attachments={message.attachments} />
                        </div>
                      </div>
                    ))
                  )}
                  {isSending && (
                    <div
                      className="followup-message followup-assistant chat-loading"
                      role="status"
                      aria-label="V6 is generating a response"
                      data-testid="chat-loading-dedicated"
                    >
                      <div className="followup-bubble">
                        <strong>V6 Trader Assistance</strong>
                        <p>
                          <span className="chat-loading-dot" />
                          V6 is thinking…
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {chatError && (
                  <p
                    className="chat-error"
                    role="alert"
                    data-testid="chat-error"
                  >
                    {chatError}
                  </p>
                )}
                <div className="chat-pending-files">
                  <ChatAttachmentList
                    attachments={pendingAttachments}
                    onRemove={removePendingAttachment}
                    disabled={isSending}
                  />
                </div>
                <form
                  className="chat-composer dedicated-chat-composer"
                  id="chat-composer"
                  onSubmit={sendMessage}
                >
                  <input
                    ref={fileInputRef}
                    hidden
                    type="file"
                    accept={CHAT_ATTACHMENT_ACCEPT}
                    multiple
                    onChange={handleAttachmentSelection}
                  />
                  <button
                    type="button"
                    className="composer-icon"
                    aria-label="Attach file"
                    disabled={isSending}
                    onClick={() => fileInputRef.current?.click()}
                    data-testid="button-dedicated-attach"
                  >
                    <Paperclip size={15} />
                  </button>
                  <textarea
                    ref={composerRef}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={submitOnEnter}
                    maxLength={1000}
                    disabled={isSending}
                    placeholder="Ask V6 AI Chat about a setup, strategy, or trading process…"
                    aria-label="Ask V6 AI Chat"
                    data-testid="input-dedicated-chat"
                    rows={1}
                  />
                  <button
                    className="send-button"
                    type="submit"
                    aria-label="Send message"
                    disabled={isSending}
                    data-testid="button-dedicated-send"
                  >
                    <Send size={15} />
                  </button>
                </form>
                <p className="dedicated-chat-disclaimer">
                  AI-generated trading education · No live market data · No
                  trades are executed · Not financial advice
                </p>
              </div>
            </div>
          </section>
        ) : isChartAnalysisOpen ? (
          <section className="chart-analysis-view" aria-label="Chart Analysis">
            <header className="dedicated-chat-header chart-analysis-header">
              <div className="dedicated-chat-identity">
                <div className="analysis-logo">
                  <ChartNoAxesCombined size={15} />
                </div>
                <div>
                  <h1>Chart Analysis</h1>
                  <p>Illustrative sample chart · No live market data</p>
                </div>
              </div>
              <button
                className="return-dashboard-button"
                onClick={() => returnToDashboard()}
                data-testid="button-chart-analysis-back-to-dashboard"
              >
                <ArrowLeft size={14} />
                <span>Back to Dashboard</span>
              </button>
            </header>
            <div className="chart-analysis-panel">
              <ChartWorkspace
                selectedSymbol={selectedSymbol}
                onSymbolChange={setSelectedSymbol}
                selectedTimeframe={selectedTimeframe}
                onTimeframeChange={setSelectedTimeframe}
                selectedChartTab={selectedChartTab}
                onChartTabChange={setSelectedChartTab}
                onNotify={notify}
                focused
              />
            </div>
          </section>
        ) : isEducationOpen ? (
          <EducationPage onBack={returnToDashboard} userId={userId} />
        ) : isSettingsOpen ? (
          <SettingsPage onBack={returnToDashboard} userId={userId} />
        ) : isBacktestingOpen ? (
          <BacktestingPage
            strategies={strategies}
            selectedStrategyId={selectedStrategyId}
            onSelectedStrategyChange={setSelectedStrategyId}
            onBack={returnToDashboard}
            onManageStrategies={() => handleNavigation("Strategies & Code")}
          />
        ) : isStrategiesOpen ? (
          <StrategiesPage
            strategies={strategies}
            onStrategiesChange={updateStrategies}
            onSendToBacktesting={(strategyId) => {
              setSelectedStrategyId(strategyId);
              handleNavigation("Backtesting");
            }}
            onBack={returnToDashboard}
            storageNotice={strategyStorageNotice}
          />
        ) : (
          <>
            <div className="center-column">
              <section className="welcome-block">
                <div className="welcome-content">
                  <div className="welcome-title-row">
                    <h1>Welcome to V6 Trader Assistance</h1>
                    <button
                      className="welcome-chat-open"
                      onClick={openDedicatedChat}
                      aria-label="Open V6 AI Chat"
                      data-testid="button-open-v6-ai-chat"
                    >
                      <MessageCircle size={11} />
                      <span>Open V6 AI Chat</span>
                    </button>
                  </div>
                  <p>
                    Your all-in-one AI trading companion. Ask me anything,
                    analyze charts,
                    <br className="desktop-break" /> review your trades, or get
                    help with your strategy.
                  </p>
                  <div className="welcome-prompt-list">
                    {welcomePrompts.map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => focusComposer(prompt)}
                        data-testid={`welcome-${prompt.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`}
                      >
                        <Sparkles size={11} /> {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              <div className="conversation">
                <div className="user-message">
                  <div className="user-message-copy">
                    <strong>You</strong>
                    <p>
                      Analyze this chart and give me your thoughts. What are the
                      key levels, possible scenarios, and what would you do?
                    </p>
                    <time>4:28 PM</time>
                  </div>
                  <div
                    className="mini-chart-thumb"
                    aria-label="Illustrative chart thumbnail"
                  >
                    <svg viewBox="0 0 100 52" role="img" aria-hidden="true">
                      <path
                        d="M2 40 12 35 19 39 28 23 35 28 45 18 53 24 62 13 72 19 80 10 89 16 98 7"
                        fill="none"
                        stroke="#00d3a0"
                        strokeWidth="2"
                      />
                      <path d="M2 47 98 47" stroke="#243149" strokeWidth="1" />
                    </svg>
                    <span>NQ · 5m</span>
                  </div>
                  <div className="user-avatar">CM</div>
                </div>

                <article
                  className="analysis-card"
                  aria-label="V6 sample market analysis"
                >
                  <div className="analysis-brand">
                    <div>
                      <strong>V6 Trader Assistance</strong>
                      <span>DEMO ANALYSIS · NOT LIVE MARKET DATA</span>
                    </div>
                    <button
                      className="more-button"
                      aria-label="Analysis options"
                      onClick={() =>
                        notify(
                          "Analysis options are not connected in this demo.",
                        )
                      }
                      data-testid="button-analysis-options"
                    >
                      <MoreHorizontal size={17} />
                    </button>
                  </div>

                  <div className="analysis-content">
                    <h2>NQ 5m — Market Analysis</h2>
                    <div className="analysis-meta">
                      <span>
                        Overall Bias:{" "}
                        <b className="bearish-text">Bearish (short-term)</b>
                      </span>
                      <i />
                      <span>Trend: Downtrend</span>
                      <i />
                      <span>Context: London Session (high volatility)</span>
                    </div>

                    <div className="analysis-grid">
                      <section className="report-section levels-section">
                        <h3>
                          <CrosshairIcon /> Key Levels
                        </h3>
                        <div className="level-row">
                          <span className="level-dot resistance-dot" />
                          <span>Resistance Zone</span>
                          <strong>21,560 – 21,580</strong>
                        </div>
                        <div className="level-row">
                          <span className="level-dot support-dot" />
                          <span>Support Zone</span>
                          <strong>21,480 – 21,500</strong>
                        </div>
                        <div className="level-row">
                          <span className="level-dot next-dot" />
                          <span>Next Support</span>
                          <strong>21,440 – 21,460</strong>
                        </div>
                      </section>

                      <section className="report-section structure-section">
                        <h3>
                          <Activity size={13} /> Market Structure
                        </h3>
                        <ul>
                          <li>Lower highs and lower lows (downtrend)</li>
                          <li>Price rejected at the resistance zone twice.</li>
                          <li>
                            Momentum is still bearish, but watch for a potential
                            short-term pullback.
                          </li>
                        </ul>
                      </section>

                      <section className="report-section scenarios-section">
                        <h3>
                          <TrendingUp size={13} /> Possible Scenarios
                        </h3>
                        <div className="scenario bearish-scenario">
                          <strong>
                            <span>1</span> Bearish Continuation (Higher
                            Probability)
                          </strong>
                          <ul>
                            <li>
                              Look for a retest of the resistance zone (21,560 –
                              21,580).
                            </li>
                            <li>
                              Confirmation: rejection candle, bearish engulfing,
                              or lower high.
                            </li>
                            <li>Target: 21,480 → 21,440.</li>
                          </ul>
                        </div>
                        <div className="scenario bullish-scenario">
                          <strong>
                            <span>2</span> Bullish Reversal (Lower Probability)
                          </strong>
                          <ul>
                            <li>Need a break and hold above 21,580.</li>
                            <li>
                              Confirmation: strong bullish candle + higher low.
                            </li>
                            <li>Target: 21,620+.</li>
                          </ul>
                        </div>
                      </section>

                      <div className="decision-stack">
                        <section className="report-section decision-section">
                          <h3>
                            <span className="violet-icon">
                              <Sparkles size={12} />
                            </span>{" "}
                            What I Would Do
                          </h3>
                          <p>
                            I would wait for confirmation of a short setup near
                            the resistance zone. If price breaks and holds above
                            21,580, I’d look for long opportunities.
                          </p>
                          <p>
                            Until then, patience is key — the trend is still
                            bearish, and the risk of a false breakout is high.
                          </p>
                        </section>
                        <section className="risk-inline">
                          <h3>
                            <ShieldCheck size={13} /> Risk Management
                          </h3>
                          <div>
                            <span>Stop Loss</span>
                            <strong>Above 21,590 (for shorts)</strong>
                          </div>
                          <div>
                            <span>Take Profit</span>
                            <strong>21,480 / 21,440</strong>
                          </div>
                          <div>
                            <span>Risk / Reward</span>
                            <strong>~1:2</strong>
                          </div>
                        </section>
                      </div>
                    </div>

                    <div className="analysis-disclaimer">
                      <CircleHelp size={12} />
                      <span>
                        This illustrative analysis is based on sample 5-minute
                        chart data. Verify every level and use your own plan
                        before acting.
                      </span>
                      <time>4:31 PM</time>
                    </div>
                  </div>
                </article>

                {messages.map((message) => (
                  <div
                    className={`followup-message ${message.role === "user" ? "followup-user" : "followup-assistant"}`}
                    key={message.id}
                    data-testid={`message-${message.role}-${message.id}`}
                  >
                    <div className="followup-bubble">
                      <strong>
                        {message.role === "user"
                          ? "You"
                          : "V6 Trader Assistance"}
                      </strong>
                      <p>
                        {message.text ||
                          (message.attachments?.length ? "Attached files" : "")}
                      </p>
                        <ChatAttachmentList attachments={message.attachments} />
                    </div>
                  </div>
                ))}

                {isSending && (
                  <div
                    className="followup-message followup-assistant chat-loading"
                    role="status"
                    aria-label="V6 is generating a response"
                    data-testid="chat-loading-dashboard"
                  >
                    <div className="followup-bubble">
                      <strong>V6 Trader Assistance</strong>
                      <p><span className="chat-loading-dot" />V6 is thinking…</p>
                    </div>
                  </div>
                )}

                {chatError && (
                  <p className="chat-error" role="alert" data-testid="chat-error">
                    {chatError}
                  </p>
                )}
                <div className="chat-pending-files">
                  <ChatAttachmentList
                    attachments={pendingAttachments}
                    onRemove={removePendingAttachment}
                    disabled={isSending}
                  />
                </div>
                <form
                  className="chat-composer"
                  id="chat-composer"
                  onSubmit={sendMessage}
                >
                  <input
                    ref={fileInputRef}
                    hidden
                    type="file"
                    accept={CHAT_ATTACHMENT_ACCEPT}
                    multiple
                    onChange={handleAttachmentSelection}
                  />
                  <button
                    type="button"
                    className="composer-icon"
                    aria-label="Attach file"
                    disabled={isSending}
                    onClick={() => fileInputRef.current?.click()}
                    data-testid="button-attach"
                  >
                    <Paperclip size={15} />
                  </button>
                  <textarea
                    ref={composerRef}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={submitOnEnter}
                    maxLength={1000}
                    disabled={isSending}
                    placeholder="Ask me anything… (charts, strategies, market news, risk management, etc.)"
                    aria-label="Ask V6 Trader Assistance"
                    data-testid="input-chat"
                    rows={1}
                  />
                  <button
                    className="composer-tool"
                    type="button"
                    aria-label="Search demo sources"
                    onClick={() =>
                      notify("Search is not connected in this demo.")
                    }
                    data-testid="button-search"
                  >
                    <Search size={14} />
                  </button>
                  <button
                    className="composer-tool"
                    type="button"
                    aria-label="Select analysis mode"
                    onClick={() =>
                      notify("Analysis mode is illustrative only.")
                    }
                    data-testid="button-analysis-mode"
                  >
                    <Activity size={14} />
                  </button>
                  <button
                    className="send-button"
                    type="submit"
                    aria-label="Send message"
                    disabled={isSending}
                    data-testid="button-send"
                  >
                    <Send size={15} />
                  </button>
                </form>
                <div className="composer-prompt-list">
                  {composerPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => focusComposer(prompt)}
                      data-testid={`composer-${prompt.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
                <div className="demo-disclaimer">
                  Demo workspace · Static sample values · No trades are executed
                  · Not financial advice
                </div>
              </div>
            </div>

            <aside className="right-column" aria-label="Market workspace">
              <ChartWorkspace
                selectedSymbol={selectedSymbol}
                onSymbolChange={setSelectedSymbol}
                selectedTimeframe={selectedTimeframe}
                onTimeframeChange={setSelectedTimeframe}
                selectedChartTab={selectedChartTab}
                onChartTabChange={setSelectedChartTab}
                onNotify={notify}
              />

              <section className="right-card market-card" id="market-overview">
                <div className="right-card-heading">
                  <div className="right-card-title">
                    <Activity size={14} />
                    <h2>Market Overview</h2>
                  </div>
                  <span className="small-badge">Futures</span>
                </div>
                <div className="market-list">
                  {(Object.keys(quotes) as SymbolCode[]).map((symbol) => (
                    <button
                      key={symbol}
                      className={`market-row ${selectedSymbol === symbol ? "market-row-selected" : ""}`}
                      onClick={() => setSelectedSymbol(symbol)}
                      data-testid={`market-${symbol.toLowerCase()}`}
                    >
                      <strong>{symbol}</strong>
                      <span>
                        {quotes[symbol].price}
                        <ChevronDown size={10} />
                      </span>
                      <b>
                        <ArrowUpRight size={11} /> {quotes[symbol].change}
                      </b>
                    </button>
                  ))}
                </div>
              </section>

              <section className="right-card account-card">
                <div className="right-card-heading">
                  <div className="right-card-title">
                    <Wallet size={14} />
                    <h2>Account Summary</h2>
                  </div>
                  <span className="demo-badge">↗ Demo</span>
                </div>
                <div className="account-rows">
                  <div>
                    <span>Balance</span>
                    <strong>$52,431.26</strong>
                  </div>
                  <div>
                    <span>Equity</span>
                    <strong>$52,431.26</strong>
                  </div>
                  <div>
                    <span>Today’s PnL</span>
                    <strong className="profit-value">+$642.50 (+1.24%)</strong>
                  </div>
                </div>
              </section>

              <section
                className="right-card activity-card"
                id="recent-activity"
              >
                <div className="right-card-heading">
                  <div className="right-card-title">
                    <Clock3 size={14} />
                    <h2>Recent Activity</h2>
                  </div>
                  <button
                    className="view-all-button"
                    onClick={() => notify("Recent activity is sample data.")}
                    data-testid="button-view-activity"
                  >
                    View All
                  </button>
                </div>
                <div className="activity-list">
                  <button
                    onClick={() => handleNavigation("Market Analysis")}
                    data-testid="activity-nq-analysis"
                  >
                    <span className="activity-icon">
                      <ChartNoAxesCombined size={12} />
                    </span>
                    <strong>NQ Analysis</strong>
                    <time>4:31 PM</time>
                  </button>
                  <button
                    onClick={() => handleNavigation("Trade Journal")}
                    data-testid="activity-journal-update"
                  >
                    <span className="activity-icon">
                      <BookOpen size={12} />
                    </span>
                    <strong>Trade Journal Update</strong>
                    <time>3:12 PM</time>
                  </button>
                  <button
                    onClick={() => handleNavigation("Strategies & Code")}
                    data-testid="activity-strategy"
                  >
                    <span className="activity-icon">
                      <Code2 size={12} />
                    </span>
                    <strong>Strategy: S&amp;R (Futures)</strong>
                    <time>1:45 PM</time>
                  </button>
                  <button
                    onClick={() => handleNavigation("News & Research")}
                    data-testid="activity-market-news"
                  >
                    <span className="activity-icon">
                      <Newspaper size={12} />
                    </span>
                    <strong>Market News (Fed / CPI)</strong>
                    <time>11:23 AM</time>
                  </button>
                </div>
              </section>
            </aside>
          </>
        )}
      </main>

      {toast && (
        <div className="toast-message" role="status" data-testid="status-toast">
          <span>{toast}</span>
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
            data-testid="button-dismiss-toast"
          >
            <X size={13} />
          </button>
        </div>
      )}
    </div>
  );
}

function CrosshairIcon() {
  return (
    <span className="crosshair-icon" aria-hidden="true">
      ⌖
    </span>
  );
}

export default App;
