---
name: V6 Trader Assistance interface scope
description: The user's standing scope rules for changes to the V6 Trader Assistance interface.
---

Keep the existing V6 Trader Assistance dashboard design as-is: do not redesign the dashboard, change the colors, or rearrange the cards. Add functionality one feature at a time. Do not add paid APIs or external services yet. Leave unrequested cards unchanged.

Use Inter throughout the interface. Keep the top-left V6 mark and the sidebar watermark beneath the slogan. Remove the welcome-panel and analysis-card V6 badges, while retaining non-V6 icon badges. Preserve the remaining marks' appearance. Change only what the user explicitly requests; avoid unrelated edits.

Workspace shortcuts and Quick Actions should route to real destinations, never fake/placeholder pages. “All Workspaces” is a dedicated directory containing the nine existing primary navigation items; its Open buttons use their existing destinations. Backtest market data and results must remain clearly labeled synthetic/demo; do not present them as live or historical, or add a data provider without the user's direct request.

**Why:** The user explicitly asked for the All Workspaces directory while requiring existing destinations and clearly labeled synthetic data.

**How to apply:** Keep the directory in sync with the nine primary navigation items and route each Open action through the current navigation handler. Preserve the accepted visual design and use local/synthetic behavior until the user asks to connect services.
