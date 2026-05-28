You are working in:
C:\Users\Naquan\userscripts

Primary target:
C:\Users\Naquan\userscripts\project-nozo-single.user.js

Source of truth for behavior:
C:\Users\Naquan\userscripts\moomoo.js

Extracted class references:
C:\Users\Naquan\userscripts\classes-out

Task:
Produce a detailed, execution-ready migration plan for unported classes in the single-file runtime.

Unported class list:
- Utils
- Traps, Traps_
- AutoBreaker
- Instakill
- Autobuy
- Autoupgrade
- Damages
- Store
- Textmanager, Animtext
- DeadPlayer, addCh, MapPing, Petal
- CachedMapResource, CachedTreeResource, CachedBushResource, CachedCatusResource, CachedStoneResource, CachedGoldminResource
- EasyStarJS, MinHeap, Node, Node_2, SearchState
- CustomLogging, LyricsPlayer, deadfuturechickenmodrevival
- Bot, BotObject, BotObjManager

Plan requirements:
1) Group classes by dependency and runtime criticality.
2) Define phased order with explicit rationale and blockers.
3) For each class:
   - source location in moomoo.js (line/range estimate)
   - current usage points in project-nozo-single.user.js
   - required adapters/bridges
   - expected side effects/state writes
   - risk level (low/med/high)
4) Mark “must port before updatePlayers full parity” vs “can defer”.
5) Include test/verification checkpoints after each phase.
6) Keep compatibility with current temporary packet gate:
   - BLOCK_PACKET_HANDOFF_UNTIL_PORT_COMPLETE
7) Do not edit moomoo.js.
8) Do not implement code in this task unless required for plan clarity; this output is a PLAN only.

Output file (required):
C:\Users\Naquan\userscripts\unported-classes-plan.md

Output structure:
- Status
- Assumptions
- Class Dependency Graph (text)
- Phased Plan (with per-class details)
- Pre-UpdatePlayers Gate Checklist
- Post-Gate Enablement Checklist
- Risks & Mitigations
- Suggested First Implementation Batch

Important:
Create `unported-classes-plan.md` only after the plan is complete.
