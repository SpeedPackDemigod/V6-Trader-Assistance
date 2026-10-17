import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import {
  Activity,
  ArrowUpRight,
  Bell,
  BookOpen,
  Bot,
  ChartNoAxesCombined,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  Code2,
  GraduationCap,
  Layers3,
  MessageCircle,
  MoreHorizontal,
  Newspaper,
  Paperclip,
  Plus,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';

type LocalMessage = {
  id: number;
  role: 'user' | 'assistant';
  text: string;
};

const primaryNavigation = [
  { name: 'Chat', icon: MessageCircle },
  { name: 'Market Analysis', icon: Activity },
  { name: 'Chart Analysis', icon: ChartNoAxesCombined },
  { name: 'Trade Journal', icon: BookOpen },
  { name: 'Strategies & Code', icon: Code2 },
  { name: 'News & Research', icon: Newspaper },
  { name: 'Education', icon: GraduationCap },
  { name: 'Backtesting', icon: TrendingUp },
  { name: 'Settings', icon: Settings },
];

const workspaces = [
  { name: 'Futures Trading', icon: Activity },
  { name: 'My Journal', icon: BookOpen },
  { name: 'Strategy Development', icon: Code2 },
  { name: 'Learning Hub', icon: GraduationCap },
  { name: 'All Workspaces', icon: Layers3 },
];

const quickActions = [
  { name: 'Analyze Chart', icon: ChartNoAxesCombined },
  { name: 'Check Market News', icon: Newspaper },
  { name: 'Open TradingView', icon: ArrowUpRight },
  { name: 'View Journal', icon: BookOpen },
];

const quotes = {
  NQ: { price: '21,542.75', change: '+87.50 (+0.41%)', rising: true },
  ES: { price: '6,001.50', change: '+24.25 (+0.41%)', rising: true },
  YM: { price: '43,287', change: '+132 (+0.31%)', rising: true },
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
const timeframes = ['1m', '5m', '15m', '1h', '4h', 'D'] as const;
const chartTabs = ['Chart', 'Indicators', 'Drawing Tools'] as const;
const welcomePrompts = [
  'Analyze a chart',
  'Check the markets',
  'Help me learn',
  'Review my trades',
  'Build a strategy',
];
const composerPrompts = [
  'Explain this setup',
  'What’s the bigger picture (1h / 4h)?',
  'How should I adjust my plan?',
  'Backtest this strategy',
  'Help me write code',
];

function formatPriceY(price: number) {
  return 12 + ((21620 - price) / (21620 - 21460)) * 220;
}

function PriceChart({ timeframe }: { timeframe: string }) {
  return (
    <div className="chart-plot" role="img" aria-label={`Illustrative NQ candlestick chart, ${timeframe} timeframe`}>
      <div className="chart-price-axis" aria-hidden="true">
        {priceTicks.map((price) => (
          <span key={price}>{price.toLocaleString('en-US')}</span>
        ))}
      </div>
      <div className="chart-svg-wrap">
        <svg className="candlestick-chart" viewBox="0 0 360 244" preserveAspectRatio="none" aria-hidden="true">
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
          <line x1="0" x2="360" y1={formatPriceY(21542.75)} y2={formatPriceY(21542.75)} className="current-price-line" />
          {candles.map(([open, high, low, close], index) => {
            const x = 5 + index * 11.25;
            const rising = close >= open;
            const top = Math.min(formatPriceY(open), formatPriceY(close));
            const height = Math.max(3, Math.abs(formatPriceY(close) - formatPriceY(open)));
            return (
              <g key={`candle-${index}`} className={rising ? 'candle-up' : 'candle-down'}>
                <line x1={x + 2.5} x2={x + 2.5} y1={formatPriceY(high)} y2={formatPriceY(low)} />
                <rect x={x} y={top} width="5" height={height} rx="1" />
              </g>
            );
          })}
        </svg>
        <span className="zone-label resistance-label">Resistance Zone<br /><strong>21,560 – 21,580</strong></span>
        <span className="zone-label support-label">Support Zone<br /><strong>21,480 – 21,500</strong></span>
        <span className="live-price-label">21,542.75</span>
      </div>
      <div className="chart-times" aria-hidden="true">
        <span>07:00</span><span>08:00</span><span>09:00</span><span>10:00</span><span>11:00</span><span>12:00</span>
      </div>
    </div>
  );
}

function App() {
  const [activeNavigation, setActiveNavigation] = useState('Chat');
  const [selectedWorkspace, setSelectedWorkspace] = useState('Futures Trading');
  const [selectedSymbol, setSelectedSymbol] = useState<SymbolCode>('NQ');
  const [selectedTimeframe, setSelectedTimeframe] = useState<(typeof timeframes)[number]>('5m');
  const [selectedChartTab, setSelectedChartTab] = useState<(typeof chartTabs)[number]>('Chart');
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [isProMode, setIsProMode] = useState(false);
  const [toast, setToast] = useState('');
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2800);
  };

  const focusComposer = (prompt?: string) => {
    if (prompt) setDraft(prompt);
    composerRef.current?.focus();
    document.getElementById('chat-composer')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const handleNavigation = (name: string) => {
    setActiveNavigation(name);
    if (name === 'Chart Analysis') {
      document.getElementById('market-chart')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (name === 'Trade Journal') {
      notify('Trade Journal is shown in this sample workspace.');
    } else if (name === 'Market Analysis') {
      document.getElementById('market-overview')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (name !== 'Chat') {
      notify(`${name} is a local demo navigation item.`);
    }
  };

  const sendMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setMessages((current) => [
      ...current,
      { id: Date.now(), role: 'user', text },
      {
        id: Date.now() + 1,
        role: 'assistant',
        text: 'This is a local demo response. Start with the level that would invalidate your idea, then consider whether the potential reward justifies the risk. No live AI or market service is connected.',
      },
    ]);
    setDraft('');
  };

  const submitOnEnter = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      const form = event.currentTarget.form;
      form?.requestSubmit();
    }
  };

  const runQuickAction = (action: string) => {
    if (action === 'Analyze Chart') {
      handleNavigation('Chart Analysis');
      focusComposer('Analyze this chart and outline the key levels.');
    } else if (action === 'Check Market News') {
      handleNavigation('News & Research');
    } else if (action === 'View Journal') {
      handleNavigation('Trade Journal');
    } else {
      notify('External charting services are not connected in this demo.');
    }
  };

  const activeQuote = quotes[selectedSymbol];

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
            <div><strong>SIMULATED MARKET DATA</strong><span>4:37:17 PM ET</span></div>
          </div>
          {(Object.keys(quotes) as SymbolCode[]).map((symbol) => (
            <button
              className={`ticker-quote ${selectedSymbol === symbol ? 'ticker-selected' : ''}`}
              key={symbol}
              onClick={() => setSelectedSymbol(symbol)}
              data-testid={`ticker-${symbol.toLowerCase()}`}
            >
              <span>{symbol} <strong>{quotes[symbol].price}</strong></span>
              <small><ArrowUpRight size={11} /> {quotes[symbol].change}</small>
            </button>
          ))}
        </div>

        <div className="topbar-actions">
          <button className={`pro-button ${isProMode ? 'pro-button-active' : ''}`} onClick={() => setIsProMode((value) => !value)} data-testid="button-pro-mode">
            <Sparkles size={13} /> {isProMode ? 'Pro Mode On' : 'Pro Mode'}
          </button>
          <button className="icon-button notification-button" aria-label="Notifications" onClick={() => notify('No new notifications in this demo.')} data-testid="button-notifications">
            <Bell size={16} /><span className="notification-dot" />
          </button>
          <button className="profile-avatar" aria-label="Demo profile" onClick={() => notify('Demo profile settings are not connected.')} data-testid="button-profile">CM</button>
        </div>
      </header>

      <aside className="sidebar" aria-label="Main navigation">
        <button className="new-chat-button" onClick={() => { setMessages([]); setDraft(''); setActiveNavigation('Chat'); notify('New local demo chat started.'); }} data-testid="button-new-chat">
          <Plus size={16} /> <span>New Chat</span>
        </button>

        <nav className="primary-navigation">
          {primaryNavigation.map(({ name, icon: Icon }) => (
            <button
              className={`navigation-item ${activeNavigation === name ? 'navigation-active' : ''}`}
              key={name}
              onClick={() => handleNavigation(name)}
              data-testid={`nav-${name.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}`}
            >
              <Icon size={15} strokeWidth={1.8} /><span>{name}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-group">
          <div className="sidebar-label">WORKSPACES</div>
          <button className="sidebar-add" aria-label="Add workspace" onClick={() => notify('Workspace creation is not enabled in this demo.')} data-testid="button-add-workspace"><Plus size={13} /></button>
          <div className="workspace-list">
            {workspaces.map(({ name, icon: Icon }) => (
              <button
                key={name}
                className={`workspace-item ${selectedWorkspace === name ? 'workspace-active' : ''}`}
                onClick={() => setSelectedWorkspace(name)}
                data-testid={`workspace-${name.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}`}
              >
                <Icon size={14} /><span>{name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="sidebar-group quick-group">
          <div className="sidebar-label">QUICK ACTIONS</div>
          <div className="quick-action-list">
            {quickActions.map(({ name, icon: Icon }) => (
              <button key={name} className="quick-action" onClick={() => runQuickAction(name)} data-testid={`quick-${name.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}`}>
                <Icon size={15} /><span>{name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="sidebar-mantra">
          BETTER<br />DECISIONS<br />BIGGER<br />OPPORTUNITIES.
          <div className="sidebar-watermark">V6</div>
        </div>
      </aside>

      <main className="main-area">
        <div className="center-column">
          <section className="welcome-block">
            <div className="welcome-logo">V6</div>
            <div className="welcome-content">
              <h1>Welcome to V6 Trader Assistance</h1>
              <p>Your all-in-one AI trading companion. Ask me anything, analyze charts,<br className="desktop-break" /> review your trades, or get help with your strategy.</p>
              <div className="welcome-prompt-list">
                {welcomePrompts.map((prompt) => (
                  <button key={prompt} onClick={() => focusComposer(prompt)} data-testid={`welcome-${prompt.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}`}>
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
                <p>Analyze this chart and give me your thoughts. What are the key levels, possible scenarios, and what would you do?</p>
                <time>4:28 PM</time>
              </div>
              <div className="mini-chart-thumb" aria-label="Illustrative chart thumbnail">
                <svg viewBox="0 0 100 52" role="img" aria-hidden="true">
                  <path d="M2 40 12 35 19 39 28 23 35 28 45 18 53 24 62 13 72 19 80 10 89 16 98 7" fill="none" stroke="#00d3a0" strokeWidth="2" />
                  <path d="M2 47 98 47" stroke="#243149" strokeWidth="1" />
                </svg>
                <span>NQ · 5m</span>
              </div>
              <div className="user-avatar">CM</div>
            </div>

            <article className="analysis-card" aria-label="V6 sample market analysis">
              <div className="analysis-brand">
                <div className="analysis-logo">V6</div>
                <div>
                  <strong>V6 Trader Assistance</strong>
                  <span>DEMO ANALYSIS · NOT LIVE MARKET DATA</span>
                </div>
                <button className="more-button" aria-label="Analysis options" onClick={() => notify('Analysis options are not connected in this demo.')} data-testid="button-analysis-options"><MoreHorizontal size={17} /></button>
              </div>

              <div className="analysis-content">
                <h2>NQ 5m — Market Analysis</h2>
                <div className="analysis-meta">
                  <span>Overall Bias: <b className="bearish-text">Bearish (short-term)</b></span>
                  <i />
                  <span>Trend: Downtrend</span>
                  <i />
                  <span>Context: London Session (high volatility)</span>
                </div>

                <div className="analysis-grid">
                  <section className="report-section levels-section">
                    <h3><CrosshairIcon /> Key Levels</h3>
                    <div className="level-row"><span className="level-dot resistance-dot" /><span>Resistance Zone</span><strong>21,560 – 21,580</strong></div>
                    <div className="level-row"><span className="level-dot support-dot" /><span>Support Zone</span><strong>21,480 – 21,500</strong></div>
                    <div className="level-row"><span className="level-dot next-dot" /><span>Next Support</span><strong>21,440 – 21,460</strong></div>
                  </section>

                  <section className="report-section structure-section">
                    <h3><Activity size={13} /> Market Structure</h3>
                    <ul>
                      <li>Lower highs and lower lows (downtrend)</li>
                      <li>Price rejected at the resistance zone twice.</li>
                      <li>Momentum is still bearish, but watch for a potential short-term pullback.</li>
                    </ul>
                  </section>

                  <section className="report-section scenarios-section">
                    <h3><TrendingUp size={13} /> Possible Scenarios</h3>
                    <div className="scenario bearish-scenario">
                      <strong><span>1</span> Bearish Continuation (Higher Probability)</strong>
                      <ul>
                        <li>Look for a retest of the resistance zone (21,560 – 21,580).</li>
                        <li>Confirmation: rejection candle, bearish engulfing, or lower high.</li>
                        <li>Target: 21,480 → 21,440.</li>
                      </ul>
                    </div>
                    <div className="scenario bullish-scenario">
                      <strong><span>2</span> Bullish Reversal (Lower Probability)</strong>
                      <ul>
                        <li>Need a break and hold above 21,580.</li>
                        <li>Confirmation: strong bullish candle + higher low.</li>
                        <li>Target: 21,620+.</li>
                      </ul>
                    </div>
                  </section>

                  <div className="decision-stack">
                    <section className="report-section decision-section">
                      <h3><span className="violet-icon"><Sparkles size={12} /></span> What I Would Do</h3>
                      <p>I would wait for confirmation of a short setup near the resistance zone. If price breaks and holds above 21,580, I’d look for long opportunities.</p>
                      <p>Until then, patience is key — the trend is still bearish, and the risk of a false breakout is high.</p>
                    </section>
                    <section className="risk-inline">
                      <h3><ShieldCheck size={13} /> Risk Management</h3>
                      <div><span>Stop Loss</span><strong>Above 21,590 (for shorts)</strong></div>
                      <div><span>Take Profit</span><strong>21,480 / 21,440</strong></div>
                      <div><span>Risk / Reward</span><strong>~1:2</strong></div>
                    </section>
                  </div>
                </div>

                <div className="analysis-disclaimer">
                  <CircleHelp size={12} />
                  <span>This illustrative analysis is based on sample 5-minute chart data. Verify every level and use your own plan before acting.</span>
                  <time>4:31 PM</time>
                </div>
              </div>
            </article>

            {messages.map((message) => (
              <div className={`followup-message ${message.role === 'user' ? 'followup-user' : 'followup-assistant'}`} key={message.id} data-testid={`message-${message.role}-${message.id}`}>
                {message.role === 'assistant' && <div className="followup-logo">V6</div>}
                <div className="followup-bubble">
                  <strong>{message.role === 'user' ? 'You' : 'V6 Trader Assistance · local demo'}</strong>
                  <p>{message.text}</p>
                </div>
              </div>
            ))}

            <form className="chat-composer" id="chat-composer" onSubmit={sendMessage}>
              <button type="button" className="composer-icon" aria-label="Attach file" onClick={() => notify('File attachments are not enabled in this visual demo.')} data-testid="button-attach"><Paperclip size={15} /></button>
              <textarea
                ref={composerRef}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={submitOnEnter}
                placeholder="Ask me anything… (charts, strategies, market news, risk management, etc.)"
                aria-label="Ask V6 Trader Assistance"
                data-testid="input-chat"
                rows={1}
              />
              <button className="composer-tool" type="button" aria-label="Search demo sources" onClick={() => notify('Search is not connected in this demo.')} data-testid="button-search"><Search size={14} /></button>
              <button className="composer-tool" type="button" aria-label="Select analysis mode" onClick={() => notify('Analysis mode is illustrative only.')} data-testid="button-analysis-mode"><Activity size={14} /></button>
              <button className="send-button" type="submit" aria-label="Send message" data-testid="button-send"><Send size={15} /></button>
            </form>
            <div className="composer-prompt-list">
              {composerPrompts.map((prompt) => <button key={prompt} onClick={() => focusComposer(prompt)} data-testid={`composer-${prompt.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}`}>{prompt}</button>)}
            </div>
            <div className="demo-disclaimer">Demo workspace · Static sample values · No trades are executed · Not financial advice</div>
          </div>
        </div>

        <aside className="right-column" aria-label="Market workspace">
          <section className="right-card chart-card" id="market-chart">
            <div className="chart-tab-bar" role="tablist" aria-label="Chart tools">
              {chartTabs.map((tab) => (
                <button className={selectedChartTab === tab ? 'chart-tab chart-tab-active' : 'chart-tab'} key={tab} role="tab" aria-selected={selectedChartTab === tab} onClick={() => setSelectedChartTab(tab)} data-testid={`tab-${tab.toLowerCase().replaceAll(' ', '-')}`}>{tab}</button>
              ))}
              <button className="chart-expand" aria-label="Chart options" onClick={() => notify('Chart controls are sample-only.')} data-testid="button-chart-options"><MoreHorizontal size={15} /></button>
            </div>
            <div className="chart-toolbar">
              <label className="symbol-select">
                <span className="symbol-icon"><Activity size={12} /></span>
                <select aria-label="Chart symbol" value={selectedSymbol} onChange={(event) => setSelectedSymbol(event.target.value as SymbolCode)} data-testid="select-chart-symbol">
                  <option value="NQ">NQ 06-25</option><option value="ES">ES 06-25</option><option value="YM">YM 06-25</option>
                </select>
                <ChevronDown size={12} />
              </label>
              <button className="chart-toolbar-button" aria-label="Add indicator" onClick={() => setSelectedChartTab('Indicators')} data-testid="button-add-indicator"><Plus size={14} /></button>
            </div>
            <div className="timeframe-list" aria-label="Chart timeframes">
              {timeframes.map((timeframe) => (
                <button className={selectedTimeframe === timeframe ? 'timeframe-option timeframe-active' : 'timeframe-option'} key={timeframe} onClick={() => setSelectedTimeframe(timeframe)} data-testid={`timeframe-${timeframe}`}>{timeframe}</button>
              ))}
              <button className="timeframe-more" aria-label="More timeframes" onClick={() => notify('More timeframes are not enabled in the demo.')} data-testid="button-more-timeframes"><MoreHorizontal size={13} /></button>
            </div>

            {selectedChartTab === 'Chart' ? (
              <div className="chart-body">
                <div className="chart-instrument-title"><span>{selectedSymbol} · {selectedTimeframe}</span><small><span className="status-dot" /> Sample</small></div>
                <PriceChart timeframe={selectedTimeframe} />
              </div>
            ) : selectedChartTab === 'Indicators' ? (
              <div className="chart-tool-panel">
                <h3>Indicators</h3>
                <p>Illustrative overlays for this sample chart</p>
                <div className="indicator-row"><span className="indicator-swatch violet-swatch" /> EMA 20 <b>21,537.25</b><Check size={13} /></div>
                <div className="indicator-row"><span className="indicator-swatch teal-swatch" /> VWAP <b>21,519.50</b><Check size={13} /></div>
                <div className="indicator-row"><span className="indicator-swatch amber-swatch" /> RSI 14 <b>42.8</b><Check size={13} /></div>
              </div>
            ) : (
              <div className="chart-tool-panel drawing-panel">
                <h3>Drawing tools</h3>
                <p>Choose a tool to preview it on the sample chart</p>
                <div className="drawing-tools">
                  {['Cursor', 'Trend line', 'Horizontal level', 'Text note'].map((tool) => (
                    <button key={tool} onClick={() => notify(`${tool} selected for the sample chart.`)} data-testid={`drawing-${tool.toLowerCase().replaceAll(' ', '-')}`}><CrosshairIcon /> {tool}</button>
                  ))}
                </div>
              </div>
            )}

            <div className="chart-legend">
              {timeframes.slice(0, 4).map((frame) => <span key={frame}>{frame === '1m' ? '07:00' : frame === '5m' ? '08:00' : frame === '15m' ? '09:00' : '10:00'}</span>)}
              <span>11:00</span><span>12:00</span>
            </div>
          </section>

          <section className="right-card market-card" id="market-overview">
            <div className="right-card-heading"><div className="right-card-title"><Activity size={14} /><h2>Market Overview</h2></div><span className="small-badge">Futures</span></div>
            <div className="market-list">
              {(Object.keys(quotes) as SymbolCode[]).map((symbol) => (
                <button key={symbol} className={`market-row ${selectedSymbol === symbol ? 'market-row-selected' : ''}`} onClick={() => setSelectedSymbol(symbol)} data-testid={`market-${symbol.toLowerCase()}`}>
                  <strong>{symbol}</strong><span>{quotes[symbol].price}<ChevronDown size={10} /></span><b><ArrowUpRight size={11} /> {quotes[symbol].change}</b>
                </button>
              ))}
            </div>
          </section>

          <section className="right-card account-card">
            <div className="right-card-heading">
              <div className="right-card-title"><Wallet size={14} /><h2>Account Summary</h2></div>
              <span className="demo-badge">↗ Demo</span>
            </div>
            <div className="account-rows">
              <div><span>Balance</span><strong>$52,431.26</strong></div>
              <div><span>Equity</span><strong>$52,431.26</strong></div>
              <div><span>Today’s PnL</span><strong className="profit-value">+$642.50 (+1.24%)</strong></div>
            </div>
          </section>

          <section className="right-card activity-card" id="recent-activity">
            <div className="right-card-heading"><div className="right-card-title"><Clock3 size={14} /><h2>Recent Activity</h2></div><button className="view-all-button" onClick={() => notify('Recent activity is sample data.')} data-testid="button-view-activity">View All</button></div>
            <div className="activity-list">
              <button onClick={() => handleNavigation('Market Analysis')} data-testid="activity-nq-analysis"><span className="activity-icon"><ChartNoAxesCombined size={12} /></span><strong>NQ Analysis</strong><time>4:31 PM</time></button>
              <button onClick={() => handleNavigation('Trade Journal')} data-testid="activity-journal-update"><span className="activity-icon"><BookOpen size={12} /></span><strong>Trade Journal Update</strong><time>3:12 PM</time></button>
              <button onClick={() => handleNavigation('Strategies & Code')} data-testid="activity-strategy"><span className="activity-icon"><Code2 size={12} /></span><strong>Strategy: S&amp;R (Futures)</strong><time>1:45 PM</time></button>
              <button onClick={() => handleNavigation('News & Research')} data-testid="activity-market-news"><span className="activity-icon"><Newspaper size={12} /></span><strong>Market News (Fed / CPI)</strong><time>11:23 AM</time></button>
            </div>
          </section>
        </aside>
      </main>

      {toast && <div className="toast-message" role="status" data-testid="status-toast"><span>{toast}</span><button aria-label="Dismiss notification" onClick={() => setToast('')} data-testid="button-dismiss-toast"><X size={13} /></button></div>}
    </div>
  );
}

function CrosshairIcon() {
  return <span className="crosshair-icon" aria-hidden="true">⌖</span>;
}

export default App;
