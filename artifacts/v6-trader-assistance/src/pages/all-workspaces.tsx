import { ArrowLeft, ArrowRight, Layers3 } from "lucide-react";
import type { ReactNode } from "react";
import "./all-workspaces.css";

type NavigationCard = {
  name: string;
  icon: ReactNode;
};

type AllWorkspacesPageProps = {
  items: NavigationCard[];
  onOpen: (name: string) => void;
  onBack: () => void;
};

const descriptions: Record<string, string> = {
  Chat: "Open the V6 chat workspace and continue a conversation.",
  "Market Analysis": "Jump to the market overview on the dashboard.",
  "Chart Analysis": "Open the interactive chart and analysis tools.",
  "Trade Journal": "Review and manage saved trades and journal notes.",
  "Strategies & Code": "Create, edit, compare, and backtest strategy rules.",
  "News & Research": "Open the existing economic calendar in a new tab.",
  Education: "Explore the existing education and learning content.",
  Backtesting: "Run strategy scenarios using clearly labeled synthetic candles.",
  Settings: "Open application settings and preferences.",
};

const slugify = (value: string) =>
  value.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export default function AllWorkspacesPage({
  items,
  onOpen,
  onBack,
}: AllWorkspacesPageProps) {
  return (
    <section
      className="all-workspaces-page"
      aria-labelledby="all-workspaces-title"
      data-testid="all-workspaces-page"
    >
      <header className="all-workspaces-header">
        <div className="all-workspaces-heading">
          <div className="all-workspaces-mark" aria-hidden="true">
            <Layers3 size={18} strokeWidth={1.8} />
          </div>
          <div className="all-workspaces-heading-copy">
            <h1 id="all-workspaces-title">All Workspaces</h1>
            <p>Open any of the nine main sections from one page.</p>
          </div>
        </div>
        <button
          type="button"
          className="all-workspaces-back"
          onClick={onBack}
          data-testid="button-all-workspaces-back"
        >
          <ArrowLeft size={14} />
          <span>Back to Dashboard</span>
        </button>
      </header>

      <div className="all-workspaces-grid">
        {items.map((item) => (
          <article
            className="all-workspaces-card"
            key={item.name}
            data-testid={`all-workspaces-card-${slugify(item.name)}`}
          >
            <div className="all-workspaces-card-title">
              <div className="all-workspaces-card-icon" aria-hidden="true">
                {item.icon}
              </div>
              <h2>{item.name}</h2>
            </div>
            <p>{descriptions[item.name]}</p>
            <button
              type="button"
              className="all-workspaces-open"
              onClick={() => onOpen(item.name)}
              aria-label={`Open ${item.name}`}
              data-testid={`all-workspaces-open-${slugify(item.name)}`}
            >
              <span>Open</span>
              <ArrowRight size={14} />
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
