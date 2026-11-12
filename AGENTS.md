# Instructions for AI agents

At the start of the agent session:

- load envs from `.env`
- read the instructions in [CONTRIBUTING.md](./CONTRIBUTING.md)

If backend code was actually changed, then verify the following all the following commands succeed:

```sh
pnpm lint
pnpm -r test
```

If frontend code was actually changed, then verify the following all the following commands succeed:
specs:

```sh
pnpm lint
```

Changes to the following files are prohibited unless explicitly consented:

```sh
**/package.json
**/*.env
**/env.ts
./README.md
./AGENTS.md
./CONTRIBUTING.md
**/20260101000000_schema.ts
**/pg-pg-schema.sql
**/ci.yml
```

Changes are always allowed when applied by the `pnpm lint` command.
