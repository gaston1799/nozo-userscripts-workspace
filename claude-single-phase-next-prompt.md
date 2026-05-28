You are working in:
C:\Users\Naquan\userscripts

Target file:
C:\Users\Naquan\userscripts\project-nozo-single.user.js

Objective:
Port actual event handler behavior from moomoo.js into the single-file runtime for all mapped packet handlers EXCEPT updatePlayers (`a`), which must remain minimal and unchanged for now.

Scope:
Implement real logic for these handlers first:
- A, D, E, G, H, I, J, K, L, M, O, P, Q, R, S, T, U, V, X, Y, 0,1,2,3,4,5,6,7,8,9

Do NOT do full `a` parity:
- Keep `a` handler as-is (minimal tuple update for local player only).
- Do not rework `a` flow; owner will do that manually later.

Critical extra requirement:
Port `advHeal`-related logic that is tied to event handling, and report:
1) where `advHeal` is defined,
2) where it is mutated,
3) where it is consumed,
4) what remains unported (if any).

Constraints:
1) Keep temporary packet gate in place:
   - BLOCK_PACKET_HANDOFF_UNTIL_PORT_COMPLETE
   - early return in ws message listener
   Do NOT remove in this phase.
2) Do not edit moomoo.js.
3) Keep dispatch safe (no unsafe prototype dynamic invocation).
4) Keep logs typed and concise.
5) Avoid broad refactors unrelated to event behavior parity.

Validation:
- Run:
  node --check project-nozo-single.user.js

Output contract:
- Create only after all edits/checks complete:
  C:\Users\Naquan\userscripts\single-phase-next-progress.md

Required output sections:
- Status: COMPLETE or BLOCKED
- Event Handlers Ported (actual behavior)
- advHeal Port Report (definition/mutation/consumption)
- Files Changed
- Validation Run
- Remaining Gaps
