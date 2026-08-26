# xyz

This is a prototype repository featuring:
- PNPM monorepo
- Typescript first (native)
- ESM first (native)
- Hono
- Zod
- Vitest
- Biome
- native subpath imports via `imports` field (e.g. `import Foe from '#src/foe.ts'`)
- cross-package monorepo imports via `exports` field and `workspace:*` dependency (e.g. `import Foe from 'foe/bar.ts'`)

## Requirements:

Dependencies:
- `fnm` (eg: `brew install fnm`)
- add `eval "$(fnm env --use-on-cd)"` into your `~/.zprofile` or `~/.profile`

Setup:
```sh
fnm install # nodejs from .nvmrc
npm install -g corepack
corepack enable # package manager from package.json
corepack install # package manager from package.json
pnpm install # install deps
export $(grep -v '^#' .env | xargs) # load env vars
pnpm env:down # remove docker containers
pnpm env:up # start docker containers
pnpm -F api db:migrate # run migrations
pnpm -F api db:seed # seed db
```

Run:
```sh
pnpm -F api start:dev
pnpm -F webapp build:dev
```

Testing:
```sh
pnpm -r test
```

Linting and typechecking:
```sh
pnpm lint
pnpm tsc
```

To run with https locally:
```sh
npx ngrok start --all --config ngrok.yml --authtoken <authtoken>
```
