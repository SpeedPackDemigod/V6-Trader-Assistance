---
name: V6 Trader Assistance interface scope
description: The user's standing scope rules for changes to the V6 Trader Assistance interface.
---

Keep the existing V6 Trader Assistance dashboard design as-is: do not redesign the dashboard, change the colors, or rearrange the cards. Add functionality one feature at a time. Do not add paid APIs or external services unless the user directly requests them. Leave unrequested cards unchanged.

Use Inter throughout the interface. Keep the top-left V6 mark and the sidebar watermark beneath the slogan. Remove the welcome-panel and analysis-card V6 badges, while retaining non-V6 icon badges. Preserve the remaining marks' appearance. Change only what the user explicitly requests; avoid unrelated edits.

Workspace shortcuts and Quick Actions should route to real destinations, never fake/placeholder pages. “All Workspaces” is a dedicated directory containing the nine existing primary navigation items; its Open buttons use their existing destinations. Backtest market data and results must remain clearly labeled synthetic/demo; do not present them as live or historical, or add a data provider without the user's direct request.

**Why:** The user explicitly asked for the All Workspaces directory while requiring existing destinations and clearly labeled synthetic data.

**How to apply:** Keep the directory in sync with the nine primary navigation items and route each Open action through the current navigation handler. Preserve the accepted visual design and use local/synthetic behavior until the user asks to connect services.

## Account flow staging

Keep public Sign Up and Log In entry points clearly non-functional until real authentication is added. The intended later flow is public landing → authentication → dashboard; account profile/settings and logout should eventually return users to the public landing page.

**Why:** The user explicitly deferred the actual account system and asked not to imply that registration or login already works.

**How to apply:** Do not add fake or local authentication. When implementing the later account step, use a real auth provider and connect it to the existing dashboard, profile/settings, and landing-page flow.

## AI chat provider scope

For V6 chat, use only OpenRouter's `openrouter/free` model router. Do not add billing, purchase credits, or configure a paid-model fallback.

**Why:** The user explicitly limited this integration to free models and prohibited credit purchases and paid fallbacks.

**How to apply:** Keep the model pinned to `openrouter/free`; do not add paid model IDs or fallback arrays. If the free router is unavailable or rate-limited, return a clear error instead of switching models.
