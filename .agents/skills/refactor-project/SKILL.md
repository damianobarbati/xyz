---

name: refactor-project
description: Restructure necessary code to improve readability and maintainability while preserving behavior and public contracts. Use for complex functions, coupling, and duplicated implementations; use cleanup-project for removal of proven unnecessary elements.
---

# refactor-project

## Preparation

- Read repository instructions, applicable nested instructions, package manifests, and lint configuration. Follow project conventions.
- Inspect requested scope, callers, public entry points, side effects, and existing tests. Identify behavior and contracts that must remain stable.
- Record initial Git status and diff, including staged and untracked files. Preserve caller edits; change overlapping files only with authorization. Respect protected files.

## Refactoring

- Apply small changes that address observed complexity, coupling, or duplicated implementations. Do not introduce abstractions or design patterns without concrete need.
- Preserve public APIs, outputs, errors, side effects, transaction boundaries, locking, and atomic conditional updates unless caller explicitly requests behavior change.
- Inspect inherited repository operations before adding methods. Keep controller, service, and repository responsibilities defined by project conventions.
- Check coverage before risky changes. Add focused behavior tests where needed; keep distinct edge cases and failure detection. Do not weaken tests or validation to accept changed behavior.
- For report-only requests, provide findings without editing files or running rewriting checks. Leave unrelated cleanup outside requested scope.

## Verification and report

- Run affected checks. Run `pnpm lint` after frontend or backend code changes and `pnpm -r test` after backend changes. Lint rewrites files: compare against initial state, preserve caller edits, and disclose changes.
- Do not install dependencies or reset services without required authorization. If checks cannot run, state exact limitation.
- Return concise English report with changes, reasons, check results, and remaining risks. Do not claim behavior preservation beyond available evidence. Do not commit, push, or publish remotely.
