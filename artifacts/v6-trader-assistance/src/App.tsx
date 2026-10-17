import { useState, type FormEvent, type KeyboardEvent } from 'react';
import {
  Activity, ArrowUpRight, BookOpen, Bot, ChartNoAxesCombined, ChevronDown,
  CircleHelp, Clock3, Command, Gauge, MessageCircle, MoreHorizontal, Plus,
  Send, ShieldCheck, Sparkles, X,
} from 'lucide-react';

type Message = { id: number; role: 'user' | 'assistant'; text: string };

const initialMessages: Message[] = [
  {
    id: 1,
    role: 'assistant',
    text: 'Good morning. I’ve been reviewing your levels for the session. ES is holding above the overnight midpoint, but price is approaching a decision area near 5,284.25. What are you seeing?',
  },
];

function App() {
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState('');
  const [timeframe, setTimeframe] = useState('1H');
  const [journalCount, setJournalCount] = useState(3);
  const [toast, setToast] = useState('');

  const announce = (text: string) => {
    setToast(text);
    window.setTimeout(() => setToast(''), 2600);
  };
  const sendMessage = (event?: FormEvent) => {
    event?.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setMessages((current) => [
      ...current,
      { id: Date.now(), role: 'user', text },
      {
        id: Date.now() + 1,
        role: 'assistant',
        text: 'A useful way to frame this is to define the invalidation first, then size the idea around that risk. The sample workspace is illustrative only—use your own plan and verify every level before acting.',
      },
    ]);
    setDraft('');
  };
  const submitOnEnter = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };
  const jumpTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  return (
    <div className="workspace">
      <aside className="rail" aria-label="Workspace navigation">
        <div className="brand-mark" aria-label="V6 Trader Assistance"><Activity size={23} strokeWidth={2.5} /></div>
        <nav className="rail-nav">
          <button className="rail-button active" title="V6 AI Chat" aria-label="V6 AI Chat" data-testid="nav-chat" onClick={() => jumpTo('chat')}><MessageCircle size={19} /></button>
          <button className="rail-button" title="Chart Analysis" aria-label="Chart Analysis" data-testid="nav-chart" onClick={() => jumpTo('chart')}><ChartNoAxesCombined size={19} /></button>
          <button className="rail-button" title="Trading Journal" aria-label="Trading Journal" data-testid="nav-journal" onClick={() => jumpTo('journal')}><BookOpen size={19} /></button>
          <button className="rail-button" title="Risk Manager" aria-label="Risk Manager" data-testid="nav-risk" onClick={() => jumpTo('risk')}><Gauge size={19} /></button>
        </nav>
        <button className="rail-button rail-bottom" aria-label="Help" data-testid="button-help" onClick={() => announce('V6 is a static practice workspace. No trades are placed here.')}><CircleHelp size={18} /></button>
      </aside>

      <main className="main-shell">
        <header className="topbar">
          <div className="wordmark"><strong>V6</strong><span>Trader assistance</span></div>
          <div className="top-actions">
            <div className="market-open"><i className="live-dot" /> Session workspace <ChevronDown size={13} /></div>
            <div className="avatar" aria-label="Trader profile">TR</div>
          </div>
        </header>

        <section className="intro">
          <div>
            <div className="eyebrow">Tuesday, June 18 · New York session</div>
            <h1>Think clearly. Trade deliberately.</h1>
            <p>Your focused workspace for analysis, reflection, and risk discipline.</p>
          </div>
          <div className="session-label"><span className="live-dot" /> SIMULATED SESSION <span>·</span> <span>09:41 ET</span></div>
        </section>

        <div className="dashboard-grid">
          <section className="panel chat-panel" id="chat" aria-labelledby="chat-title">
            <div className="panel-head">
              <div className="section-heading">
                <div className="icon-box"><Bot size={17} /></div>
                <div><h2 id="chat-title">V6 AI Chat</h2><small>Market thinking partner</small></div>
              </div>
              <button className="text-button" aria-label="More chat options" data-testid="button-chat-options" onClick={() => announce('Chat options are ready for this local demo.')}><MoreHorizontal size={19} /></button>
            </div>
            <div className="chat-body" aria-live="polite">
              {messages.map((message) => message.role === 'assistant' ? (
                <div className="ai-message" key={message.id} data-testid={`message-assistant-${message.id}`}>
                  <div className="ai-orb"><Sparkles size={15} /></div>
                  <div className="message-copy">
                    <div className="message-meta">V6 <time>{message.id === 1 ? '09:38 AM' : 'just now'}</time></div>
                    <p>{message.text}</p>
                    {message.id === 1 && <>
                      <div className="insight-box"><strong>Context, not a signal.</strong> The 5,280–5,284 zone has been a two-way area this morning. Let a clear reaction develop before forming a thesis.</div>
                      <div className="mini-stats">
                        <div className="mini-stat"><span>Overnight high</span><strong>5,291.75</strong></div>
                        <div className="mini-stat"><span>Session range</span><strong>18.25 pts</strong></div>
                        <div className="mini-stat"><span>VWAP</span><strong className="positive">5,276.50</strong></div>
                      </div>
                    </>}
                  </div>
                </div>
              ) : (
                <div className="user-bubble" key={message.id} data-testid={`message-user-${message.id}`}>{message.text}</div>
              ))}
              <div className="quick-prompts">
                {['Help me review this setup', 'Check my risk first', 'Journal a trade'].map((prompt) => (
                  <button className="prompt-chip" key={prompt} data-testid={`prompt-${prompt.toLowerCase().replaceAll(' ', '-')}`} onClick={() => setDraft(prompt)}>{prompt}</button>
                ))}
              </div>
            </div>
            <form className="chat-composer" onSubmit={sendMessage}>
              <div className="composer-shell">
                <textarea
                  aria-label="Message V6"
                  data-testid="input-chat"
                  placeholder="Ask about a setup, your process, or market context…"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={submitOnEnter}
                  rows={1}
                />
                <div className="composer-foot">
                  <span className="composer-hint"><Command size={11} /> Enter to send <span>·</span> Shift + Enter for a new line</span>
                  <button className="send-button" aria-label="Send message" data-testid="button-send" type="submit"><Send size={15} /></button>
                </div>
              </div>
            </form>
          </section>

          <div className="side-stack">
            <section className="panel chart-panel" id="chart" aria-labelledby="chart-title">
              <div className="panel-head">
                <div className="section-heading">
                  <div className="icon-box"><ChartNoAxesCombined size={17} /></div>
                  <div><h2 id="chart-title">Chart Analysis</h2><small>Illustrative market snapshot</small></div>
                </div>
                <div className="chart-head-right"><span className="symbol-pill">ES · CME</span></div>
              </div>
              <div className="chart-content">
                <div className="chart-summary"><strong>5,283.25</strong><span>+0.42% <ArrowUpRight size={12} /></span></div>
                <div className="chart-subtitle">E-mini S&amp;P 500 · Sample price action</div>
                <div className="chart-wrap" role="img" aria-label={`Illustrative ES price chart, ${timeframe} timeframe`}>
                  <svg viewBox="0 0 520 140" preserveAspectRatio="none" aria-hidden="true">
                    <defs><linearGradient id="fillLine" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#72c9f4" stopOpacity=".21" /><stop offset="100%" stopColor="#72c9f4" stopOpacity="0" /></linearGradient></defs>
                    <path d="M0 103 C18 98 25 108 40 88 S65 78 76 84 S95 71 111 80 S134 72 148 65 S173 71 188 58 S211 67 227 52 S246 60 262 47 S280 55 295 43 S314 55 330 39 S354 43 368 50 S389 38 407 43 S428 29 442 39 S465 34 480 26 S501 31 520 18 L520 140 L0 140 Z" fill="url(#fillLine)" />
                    <path d="M0 103 C18 98 25 108 40 88 S65 78 76 84 S95 71 111 80 S134 72 148 65 S173 71 188 58 S211 67 227 52 S246 60 262 47 S280 55 295 43 S314 55 330 39 S354 43 368 50 S389 38 407 43 S428 29 442 39 S465 34 480 26 S501 31 520 18" fill="none" stroke="#83d2f7" strokeWidth="2.2" vectorEffect="non-scaling-stroke" />
                    <path d="M0 117 C72 109 112 102 166 98 S254 88 304 82 S395 74 520 65" fill="none" stroke="#d4af72" strokeWidth="1" strokeDasharray="4 4" opacity=".72" vectorEffect="non-scaling-stroke" />
                  </svg>
                  <span className="chart-label">5,283.25</span>
                </div>
                <div className="chart-footer">
                  <div className="timeframes">{['15M', '1H', '4H', '1D'].map((frame) => <button key={frame} className={`timeframe ${timeframe === frame ? 'selected' : ''}`} data-testid={`timeframe-${frame.toLowerCase()}`} onClick={() => setTimeframe(frame)}>{frame}</button>)}</div>
                  <span className="chart-volume">VWAP <b>5,276.50</b></span>
                </div>
              </div>
            </section>

            <div className="lower-grid">
              <section className="panel journal-panel" id="journal" aria-labelledby="journal-title">
                <div className="panel-head">
                  <div className="section-heading">
                    <div className="icon-box"><BookOpen size={16} /></div>
                    <div><h2 id="journal-title">Trading Journal</h2><small>Process over outcome</small></div>
                  </div>
                  <button className="text-button" aria-label="Journal options" data-testid="button-journal-options" onClick={() => announce('Journal entries are saved locally in this demo session.')}><MoreHorizontal size={18} /></button>
                </div>
                <div className="journal-content">
                  <div className="journal-entry">
                    <div className="entry-icon"><ArrowUpRight size={14} /></div>
                    <div><div className="entry-title">Waited for the retest</div><div className="entry-detail">ES · Followed entry plan, no chase</div></div>
                    <span className="entry-date">09:12</span>
                  </div>
                  <div className="journal-bottom">
                    <span className="journal-count">{journalCount} notes today</span>
                    <button className="small-action" data-testid="button-add-journal" onClick={() => { setJournalCount((count) => count + 1); announce('A new reflection note was added.'); }}><Plus size={13} /> Add note</button>
                  </div>
                </div>
              </section>

              <section className="panel risk-panel" id="risk" aria-labelledby="risk-title">
                <div className="panel-head">
                  <div className="section-heading">
                    <div className="icon-box"><ShieldCheck size={17} /></div>
                    <div><h2 id="risk-title">Risk Manager</h2><small>Session guardrails</small></div>
                  </div>
                  <button className="text-button" aria-label="Risk details" data-testid="button-risk-details" onClick={() => announce('Risk values are sample-only and are not connected to a brokerage.')}><MoreHorizontal size={18} /></button>
                </div>
                <div className="risk-content">
                  <div className="risk-meter-head"><span>Daily risk used</span><strong>0.42%</strong></div>
                  <div className="meter"><i /></div>
                  <div className="meter-scale"><span>0%</span><span>1% soft limit</span></div>
                  <div className="risk-rows">
                    <div className="risk-row"><span>Remaining allowance</span><strong>$580</strong></div>
                    <div className="risk-row"><span>Open exposure</span><strong>$120</strong></div>
                  </div>
                  <div className="risk-status"><ShieldCheck size={13} /> Within your sample guardrails</div>
                </div>
              </section>
            </div>
          </div>
        </div>
        <div className="disclaimer"><Clock3 size={10} style={{ verticalAlign: '-1px', marginRight: 4 }} /> Static sample data for educational use · Not financial advice · No trades are executed</div>
      </main>
      {toast && <div className="toast-note" role="status" data-testid="status-toast">{toast}<button aria-label="Dismiss notification" data-testid="button-dismiss-toast" onClick={() => setToast('')} style={{ background: 'none', border: 0, color: 'inherit', marginLeft: 12, padding: 0, verticalAlign: 'middle' }}><X size={13} /></button></div>}
    </div>
  );
}

export default App;
