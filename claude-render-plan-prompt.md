You are analyzing render-port strategy only. Do not edit files.

Workspace: C:\Users\Naquan\userscripts
Primary source: moomoo.js
Target runtime: project-nozo-next.user.js + project-nozo-externals/src/render.js

Task:
1) Locate and inspect function updateGameNew() (or equivalent current game render loop path) in moomoo.js.
2) Extract a structured map of render responsibilities and order:
   - world/background/biome layers
   - game objects and players
   - projectiles/AI/effects/text
   - HUD/action bar/reload visuals
   - camera transforms / scale / interpolation
   - any dependencies on globals, assets, caches
3) Identify what must be ported first to run a full Nozo-owned render loop after RAF cancellation.
4) Propose a staged migration plan that avoids broken visuals and minimizes CPU.
5) Include explicit guidance for:
   - killing original RAF safely
   - replacing with Nozo tick/render scheduler
   - keeping overlay separate for debug/reload UI
   - validating parity and performance
6) Call out hard blockers or unknowns requiring extra instrumentation.

Output contract:
- Write exactly one file at:
  C:\Users\Naquan\userscripts\claude-render-port-plan.md
- Do not write any other files.
- If blocked, still write the file with "Status: BLOCKED" and what is missing.

Format required in output file:
- Status
- Findings (ordered)
- Render graph (ordered list)
- Migration stages (phase-by-phase)
- RAF replacement strategy
- Performance guardrails
- Validation checklist
- Risks and mitigations
