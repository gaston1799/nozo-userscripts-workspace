# Local Subagent Tools TODO

## Next Wrapper Improvements

- [ ] Add parallel command execution.
  - Add `--parallel-commands` default on.
  - Add `--no-parallel-commands`.
  - Add `--max-parallel 4`.
  - Validate every command in the batch before launching any command.
  - Preserve command output order by command number.
  - Run parallel only for `--shell-profile read` and `--shell-profile test`; keep `broad` sequential unless explicitly allowed later.
  - Include timeout/denied/error status per command in `command_results.md`.

- [ ] Add evidence enforcement beyond prompting.
  - Keep `--require-evidence` on by default.
  - Add optional `--fail-on-ungrounded`.
  - Reject analysis responses that mention files/functions without `file:line` citations when context is available.
  - Add an automatic repair pass asking the model to add missing evidence.

- [ ] Add local benchmark command or script.
  - Compare `qwen3-coder:30b`, Devstral 24B, Qwen2.5-Coder 14B, and DeepSeek-Coder-V2-Lite.
  - Use Project Nozo tasks, not generic puzzles.
  - Score evidence quality, hallucinations, command use, edit parse success, runtime, and diff quality.

- [ ] Improve retrieval.
  - Add `--symbols` to extract likely JS function/class/object anchors.
  - Add `--changed-context` to include snippets around changed `git diff` hunks.
  - Add `--ripgrep-json` internal parser for structured `rg --json` results.

- [ ] Improve edit safety.
  - Add `--dry-run-edits` to validate edit blocks without writing.
  - Add better unified-diff support for new files and deletes.
  - Add automatic rollback if post-edit validation fails.

## Online Tool Candidates To Research

- [ ] Add `rg --json` support for structured search results.
  - Source: ripgrep documents JSON output for piping search results to other tools: https://ripgrep.dev/features/
  - Use for `--grep` internals instead of parsing plain text.
  - Store normalized matches as `{path,line,column,text,context}`.
  - This should be the first tool addition because `rg` is already installed/expected in agent workflows.

- [ ] Add `ast-grep` / `sg` integration for syntax-aware JavaScript search.
  - Sources:
    - https://ast-grep.github.io/
    - https://ast-grep.github.io/reference/cli/run.html
    - https://clis.dev/cli/ast-grep
  - Useful for finding function calls, object methods, assignments, and module patterns without brittle text search.
  - Add wrapper flags:
    - `--sg-pattern <pattern>`
    - `--sg-lang javascript`
    - `--sg-json`
  - Keep rewrite/codemod disabled at first; use search only.

- [ ] Add Tree-sitter symbol extraction.
  - Source: Tree-sitter is used for symbolic code navigation and local code intelligence: https://en.wikipedia.org/wiki/Tree-sitter_%28parser_generator%29
  - Related idea: Codebase-Memory uses Tree-sitter-based knowledge graphs for LLM code exploration: https://arxiv.org/abs/2603.27277
  - Use for `--symbols`, `--function <name>`, and chunking `moomoo.js` by function/object boundaries.
  - For JavaScript, start with a simple Node package or `ast-grep` before building a custom parser.

- [ ] Add an Aider-style local benchmark suite.
  - Source: Aider Polyglot measures model code-editing performance across multiple languages: https://aider.chat/2024/09/26/architect.html
  - Source: Aider separates architect/reasoning and editor models for better edit reliability.
  - Apply locally as:
    - planner model pass
    - editor model pass
    - diff apply
    - external verification/scoring

- [ ] Add SWE-agent/OpenHands-inspired trajectory logs.
  - Sources:
    - SWE-agent CLI and tool configs: https://swe-agent.com/latest/usage/cli/ and https://swe-agent.com/1.0/reference/tools_config/
    - OpenHands model/tool orchestration and local LLM support: https://docs.openhands.dev/openhands/usage/llms
    - OpenHands platform emphasizes command-line interaction and code editing: https://arxiv.org/abs/2407.16741
  - Current run logs are good; expand them into replayable trajectories:
    - prompt
    - model response
    - commands requested
    - command outputs
    - edits applied
    - diff and post-edit review
    - final score/result

- [ ] Add Continue-style codebase awareness/indexing later.
  - Source: Continue has used local indexing with embeddings plus keyword search: https://docs.continue.dev/reference/deprecated-codebase
  - Do not start here. It is heavier and can add background model load.
  - Consider after `rg --json`, `ast-grep`, and symbol extraction are stable.

- [ ] Add local model comparison tooling.
  - Sources:
    - OpenHands uses SWE-bench-based evaluations for model selection: https://docs.openhands.dev/openhands/usage/llms
    - Aider benchmark patterns are useful for edit scoring: https://aider.chat/2024/09/26/architect.html
  - Create `lsa-bench` or `lsa --bench` with Project Nozo tasks:
    - evidence-only review
    - hallucination trap
    - shell-use task
    - small edit task on temp copy
    - phase planning task
  - Score models on evidence, hallucination, edit parse success, runtime, and diff quality.

## Recommended Implementation Order

1. Parallel command execution.
2. `rg --json` structured search.
3. Evidence enforcement repair/fail modes.
4. `ast-grep` search-only integration.
5. Project Nozo benchmark suite.
6. Tree-sitter/symbol-aware extraction.
7. Trajectory replay logs.
8. Optional codebase embedding/indexing.

