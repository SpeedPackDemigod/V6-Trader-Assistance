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

Use Clerk for real sign-up and login, keeping the existing public landing page and its account buttons. The public landing remains available while signed out; authenticated users enter the dashboard, and logout returns them to the landing page. Protect private API routes and keep browser-stored workspace data scoped to the Clerk user ID.

**Why:** The user requested a real authentication system while preserving the existing landing page and saved browser data. Current chats, journals, settings, learning progress, and strategies are browser-local; authentication does not imply cross-device/server synchronization.

**How to apply:** Do not add fake or local authentication. Keep the existing Sign Up and Log In buttons as entry points, route them to the auth provider, require a signed-in session for the app and private APIs, and scope local workspace storage by provider user ID. Do not claim local data syncs across devices.

## AI chat provider scope

For V6 chat, use only OpenRouter's `openrouter/free` model router. Do not add billing, purchase credits, or configure a paid-model fallback.

**Why:** The user explicitly limited this integration to free models and prohibited credit purchases and paid fallbacks.

**How to apply:** Keep the model pinned to `openrouter/free`; do not add paid model IDs or fallback arrays. If the free router is unavailable or rate-limited, return a clear error instead of switching models.
