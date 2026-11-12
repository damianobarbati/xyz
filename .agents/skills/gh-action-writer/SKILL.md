---

name: github-actions-writer
description: Create, fix, or simplify GitHub Actions workflows. Use for workflow implementation, action upgrades, execution limits, caching, and YAML formatting; use investigate-failed-workflow to diagnose a specific failed run.
---

# GitHub Actions Writer

## Workflow changes

- Read repository instructions and existing workflows. Preserve event, branch, deployment, and reusable workflow contracts unless requested changes require otherwise.
- Give each step descriptive `name`. Use two-space YAML indentation and blank lines between steps and jobs.
- Use latest stable major tag for external actions, such as `actions/checkout@v7`. Verify latest stable major and runner compatibility from official sources when adding or upgrading actions. Do not use commit hashes, minor or patch tags, or branch references. Do not upgrade unrelated actions solely for formatting.
- Read toolchain versions from repository `package.json`; do not hardcode Node.js or pnpm versions in workflows. Use `actions/setup-node` with `node-version-file: package.json` for `engines.node`. Omit `pnpm/action-setup` version input to use `packageManager`.
- Set explicit `timeout-minutes` on jobs that execute steps. Jobs that call reusable workflows do not support this property; define execution limits in called workflow.
- Use literal block scalar `|` for multiline shell commands. Do not use folded `>` when line folding changes shell behavior or join complex commands with semicolons.
- Cache dependencies when safe and useful. Avoid redundant setup or builds without removing required isolation or changing artifacts consumed by other jobs.

## Permissions and inputs

- Grant minimum required token permissions at workflow or job level. Expose secrets only to steps that need them.
- Pass untrusted event values through environment variables or structured inputs, with shell quoting and validation. Do not interpolate them directly into shell source.
- Preserve separation between untrusted PR execution and privileged evidence analysis or publication. Do not execute PR code in privileged follow-up jobs.

## Validation

- Review changed workflow syntax, expressions, supported job keys, referenced actions, scripts, and reusable workflow inputs. Use existing local validators where available; do not install tools without required authorization.
- Check relevant event paths, permissions, conditions, and artifact dependencies. Report checks performed and any behavior that still requires GitHub execution.
- Do not trigger runs, deploy, commit, push, or publish unless caller authorizes those actions.
