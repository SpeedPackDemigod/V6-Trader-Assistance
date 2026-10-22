import {
  Activity,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Braces,
  ChartNoAxesCombined,
  ChevronRight,
  CircleHelp,
  ExternalLink,
  GraduationCap,
  Layers3,
  LineChart,
  Newspaper,
  NotebookPen,
  Play,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import "./public-pages.css";

type LandingPageProps = {
  onGetStarted: () => void;
  onAboutUs: () => void;
  onAccountAction: (action: "Sign Up" | "Log In") => void;
  onOpenFeature: (section: string) => void;
};

const features = [
  {
    title: "AI Trading Chat",
    description: "Ask trading questions, work through concepts, and use guided prompts to structure your thinking.",
    note: "Guided analysis",
    icon: Sparkles,
    section: "Chat",
  },
  {
    title: "Market Analysis",
    description: "Review market context and levels in an organized, easy-to-scan workspace.",
    note: "Market context",
    icon: Activity,
    section: "Market Analysis",
  },
  {
    title: "Chart Analysis",
    description: "Study price action, chart structure, and illustrative support and resistance zones.",
    note: "Price action",
    icon: ChartNoAxesCombined,
    section: "Chart Analysis",
  },
  {
    title: "Strategies & Code",
    description: "Collect strategy ideas, define rules, and keep development notes together.",
    note: "Idea development",
    icon: Braces,
    section: "Strategies & Code",
  },
  {
    title: "Trading Journal",
    description: "Record trades and revisit the decisions, setups, and lessons behind them.",
    note: "Trade review",
    icon: NotebookPen,
    section: "Trade Journal",
  },
  {
    title: "Backtesting",
    description: "Explore and evaluate strategy concepts with clearly labeled synthetic data.",
    note: "Sample scenarios",
    icon: LineChart,
    section: "Backtesting",
  },
  {
    title: "Trading Academy",
    description: "Build your understanding through structured lessons and learning material.",
    note: "Structured learning",
    icon: GraduationCap,
    section: "Education",
  },
  {
    title: "News & Research",
    description: "Open market-related headlines and economic calendar research in a new tab.",
    note: "External resource",
    icon: Newspaper,
    href: "https://www.forexfactory.com/calendar/",
  },
  {
    title: "TradingView Access",
    description: "Open TradingView markets when you want to continue your chart research.",
    note: "External resource",
    icon: ArrowUpRight,
    href: "https://www.tradingview.com/markets",
  },
];

function BrandMark() {
  return (
    <span className="v6-brand-mark" aria-hidden="true">
      <span>V<span>6</span></span>
    </span>
  );
}

function MarketSketch() {
  const bars = [
    [25, 74, 96, 63, 78],
    [52, 64, 82, 52, 72],
    [79, 57, 76, 49, 61],
    [106, 65, 80, 56, 73],
    [133, 55, 75, 42, 48],
    [160, 43, 60, 36, 53],
    [187, 54, 72, 46, 66],
    [214, 66, 82, 58, 61],
    [241, 55, 71, 40, 46],
    [268, 48, 65, 34, 58],
    [295, 55, 75, 44, 68],
    [322, 61, 82, 53, 57],
    [349, 49, 70, 39, 44],
    [376, 43, 61, 32, 55],
    [403, 56, 77, 47, 72],
    [430, 65, 87, 57, 64],
    [457, 55, 74, 40, 49],
    [484, 49, 66, 35, 42],
  ];
  return (
    <div className="market-sketch" aria-label="Illustrative sample chart with marked levels" role="img">
      <div className="sketch-toolbar">
        <span><i /> NQ · 5m</span>
        <span className="sample-pill">SAMPLE VIEW</span>
      </div>
      <div className="sketch-chart">
        <div className="sketch-level sketch-resistance"><span>RESISTANCE AREA</span></div>
        <div className="sketch-level sketch-support"><span>SUPPORT AREA</span></div>
        <svg viewBox="0 0 520 126" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="chart-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#a98aff" stopOpacity=".22" />
              <stop offset="100%" stopColor="#a98aff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0 108 C45 100 55 79 94 83 S148 58 176 63 S226 43 254 57 S305 77 334 48 S381 31 410 48 S465 66 520 20 L520 126 L0 126Z" fill="url(#chart-fill)" />
          <path d="M0 108 C45 100 55 79 94 83 S148 58 176 63 S226 43 254 57 S305 77 334 48 S381 31 410 48 S465 66 520 20" fill="none" stroke="#a98aff" strokeWidth="2" />
          {bars.map(([x, open, high, low, close], index) => (
            <g key={index} className={close < open ? "sketch-candle-down" : "sketch-candle-up"}>
              <line x1={x} x2={x} y1={high} y2={low} />
              <rect x={x - 3} y={Math.min(open, close)} width="6" height={Math.max(4, Math.abs(close - open))} rx="1" />
            </g>
          ))}
          {[20, 50, 80, 110].map((y) => <line key={y} x1="0" x2="520" y1={y} y2={y} className="sketch-grid" />)}
        </svg>
        <div className="sketch-price-tag">21,542.75 <span>↗</span></div>
        <div className="sketch-axis-labels"><span>09:00</span><span>10:00</span><span>11:00</span><span>12:00</span></div>
      </div>
      <div className="sketch-caption">
        <span><span className="caption-keyline" /> Structure first. Decisions second.</span>
        <span className="caption-disclaimer"><ShieldCheck size={12} /> Illustrative data</span>
      </div>
    </div>
  );
}

export function LandingPage({
  onGetStarted,
  onAboutUs,
  onAccountAction,
  onOpenFeature,
}: LandingPageProps) {
  const scrollToFeatures = () => document.getElementById("v6-features")?.scrollIntoView({ behavior: "smooth" });
  return (
    <main className="v6-public">
      <header className="public-nav">
        <a className="public-brand" href="#top" aria-label="V6 Trader Assistance home">
          <BrandMark />
          <span className="public-brand-copy"><strong>V6 TRADER ASSISTANCE</strong><small>YOUR FUTURES TRADING WORKSPACE</small></span>
        </a>
        <nav className="public-nav-links" aria-label="Main navigation">
          <button type="button" onClick={scrollToFeatures}>Workspace</button>
          <button type="button" onClick={onAboutUs}>About us</button>
        </nav>
        <button className="public-nav-cta" type="button" onClick={onGetStarted}>
          Enter workspace <ArrowRight size={15} />
        </button>
      </header>

      <section className="public-hero" id="top">
        <div className="hero-gridline" aria-hidden="true" />
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-rule" /> A clearer process for futures traders</div>
          <h1>Better Decisions.<br /><em>Bigger Opportunities.</em></h1>
          <p className="hero-description">Your futures trading workspace for market analysis, chart study, strategy development, trading education, and performance tracking — all in one place.</p>
          <div className="hero-actions">
            <button className="button-primary" type="button" onClick={onGetStarted}>Get Started <ArrowRight size={16} /></button>
            <button className="button-secondary" type="button" onClick={scrollToFeatures}><span className="play-icon"><Play size={10} fill="currentColor" /></span> Explore Features</button>
            <button className="button-text" type="button" onClick={onAboutUs}>About Us <ChevronRight size={15} /></button>
            <div
              className="hero-account-actions"
              role="group"
              aria-label="Account access"
            >
              <button
                className="public-account-link public-account-login"
                type="button"
                onClick={() => onAccountAction("Log In")}
              >
                Log In
              </button>
              <button
                className="public-account-link public-account-signup"
                type="button"
                onClick={() => onAccountAction("Sign Up")}
              >
                Sign Up
              </button>
            </div>
          </div>
          <div className="hero-proof">
            <span><ShieldCheck size={14} /> Built for deliberate study</span>
            <i />
            <span>Sample data only</span>
          </div>
        </div>
        <div className="hero-visual">
          <div className="visual-orbit orbit-one" />
          <div className="visual-orbit orbit-two" />
          <div className="visual-index">01 <span> / WORKSPACE PREVIEW</span></div>
          <MarketSketch />
          <div className="hero-side-note"><span className="side-note-line" /> Reading context, not chasing noise</div>
          <div className="hero-coordinates">NQ 06—25 <span>·</span> DEMO ENVIRONMENT</div>
        </div>
        <div className="hero-scroll-hint"><span>SCROLL TO EXPLORE</span><ArrowDown size={13} /></div>
      </section>

      <section className="trust-strip" aria-label="Product principles">
        <div className="trust-item"><span className="trust-number">01</span><span>Organize the full process</span></div>
        <div className="trust-item"><span className="trust-number">02</span><span>Study with sample data</span></div>
        <div className="trust-item"><span className="trust-number">03</span><span>Stay in control of every decision</span></div>
        <div className="trust-note"><CircleHelp size={14} /> No live feed. No automated execution.</div>
      </section>

      <section className="features-section" id="v6-features">
        <div className="section-heading">
          <div>
            <div className="eyebrow"><span className="eyebrow-rule" /> THE WORKSPACE</div>
            <h2>Everything You Need<br /><em>in One Workspace</em></h2>
          </div>
          <p>One place to do the work around a trade: study the market, build your understanding, and learn from your review.</p>
        </div>
        <div className="feature-grid">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            const content = (
              <>
                <div className="feature-card-top"><span className="feature-icon"><Icon size={18} strokeWidth={1.7} /></span><span className="feature-index">0{index + 1}</span></div>
                <div className="feature-card-copy"><h3>{feature.title}</h3><p>{feature.description}</p></div>
                <div className="feature-card-bottom"><span>{feature.note}</span>{feature.href ? <ExternalLink size={14} /> : <ArrowUpRight size={15} />}</div>
              </>
            );
            return feature.href ? (
              <a className="feature-card feature-card-link" href={feature.href} key={feature.title} target="_blank" rel="noreferrer" aria-label={`${feature.title} (opens in a new tab)`}>{content}</a>
            ) : (
              <button className="feature-card feature-card-button" key={feature.title} type="button" onClick={() => onOpenFeature(feature.section!)}>{content}</button>
            );
          })}
        </div>
        <p className="features-footnote"><ShieldCheck size={14} /> Features are designed for study and organization. Market figures and chart visuals shown here are illustrative sample data.</p>
      </section>

      <section className="process-section">
        <div className="process-intro">
          <div className="eyebrow"><span className="eyebrow-rule" /> A REPEATABLE RHYTHM</div>
          <h2>Trade with a process.<br /><em>Not a promise.</em></h2>
          <p>V6 brings the parts of preparation and review into a single, considered flow. Your plan stays yours.</p>
        </div>
        <div className="process-steps">
          <article className="process-step"><span className="step-no">01</span><div className="step-icon"><Target size={20} /></div><div><h3>Analyze</h3><p>Study market context and price action before shaping an idea.</p></div><span className="step-tail">CONTEXT →</span></article>
          <article className="process-step"><span className="step-no">02</span><div className="step-icon"><Layers3 size={20} /></div><div><h3>Develop</h3><p>Learn concepts and organize strategy ideas into clear rules.</p></div><span className="step-tail">CLARITY →</span></article>
          <article className="process-step"><span className="step-no">03</span><div className="step-icon"><BookOpen size={20} /></div><div><h3>Review</h3><p>Journal trades and reflect on performance, decisions, and lessons.</p></div><span className="step-tail">LEARNING ↗</span></article>
        </div>
      </section>

      <section className="closing-section">
        <div className="closing-mark" aria-hidden="true">V6</div>
        <div className="closing-copy">
          <div className="eyebrow"><span className="eyebrow-rule" /> YOUR NEXT SESSION STARTS HERE</div>
          <h2>Build a Better<br /><em>Trading Process.</em></h2>
          <p>Bring your market study, strategy development, and trade review into one organized workspace.</p>
          <button className="button-primary" type="button" onClick={onGetStarted}>Get Started <ArrowRight size={16} /></button>
        </div>
        <div className="closing-aside">
          <div className="closing-aside-line" />
          <span>Study carefully.<br />Decide independently.</span>
          <small>FUTURES TRADING INVOLVES SUBSTANTIAL RISK</small>
        </div>
      </section>

      <footer className="public-footer">
        <div className="footer-main">
          <a className="public-brand footer-brand" href="#top" aria-label="V6 Trader Assistance home"><BrandMark /><span className="public-brand-copy"><strong>V6 TRADER ASSISTANCE</strong><small>ANALYZE / LEARN / REVIEW</small></span></a>
          <nav className="footer-links" aria-label="Footer navigation">
            <button type="button" onClick={scrollToFeatures}>Workspace</button>
            <button type="button" onClick={onAboutUs}>About Us</button>
            <button type="button" onClick={onGetStarted}>Get Started <ArrowUpRight size={12} /></button>
          </nav>
        </div>
        <div className="footer-bottom">
          <p>V6 TRADER ASSISTANCE is a trading education and analysis tool, not financial advice. Trading futures involves substantial risk.</p>
          <span>© V6 TRADER ASSISTANCE</span>
        </div>
      </footer>
    </main>
  );
}

export function AboutUsPage({ onBack }: { onBack: () => void }) {
  return (
    <main className="v6-about-page">
      <button
        className="about-back-button"
        type="button"
        onClick={onBack}
        aria-label="Back to the landing page"
      >
        <ArrowLeft size={18} aria-hidden="true" />
      </button>
      <article className="v6-about-content">
        <h1>Who We Are</h1>
        <p className="v6-about-lead">
          <strong>Behind every vision is a team willing to bring it to life.</strong>
        </p>
        <div className="v6-about-copy">
          <p>
            V6 TRADER ASSISTANCE was founded with a vision to create a smarter,
            more organized trading experience. As Founder and CEO, I lead the
            development and direction of V6, working to bring market analysis,
            strategy development, trading education, and performance tracking
            together in one platform.
          </p>
          <p>
            Our goal is to build more than just another trading tool. We want to
            create a space where traders can develop their understanding of the
            markets, refine their approach, and build better trading habits
            through education, analysis, and consistency.
          </p>
          <p>
            Behind the vision is a growing circle of supporters helping spread
            the word and introduce V6 to new audiences. Their support and
            commitment to promoting the brand play an important role in helping
            us reach more people and grow our community.
          </p>
          <p>
            We&apos;re building V6 one step at a time, with a focus on continuous
            improvement, innovation, and a long-term vision for the future of
            trading technology.
          </p>
        </div>
        <p className="v6-about-closing">
          <strong>One vision. One mission. A better way to approach the markets.</strong>
        </p>
        <p className="v6-about-signoff">
          <em>V6 TRADER ASSISTANCE — Better Decisions. Bigger Opportunities.</em>
        </p>
      </article>
    </main>
  );
}
