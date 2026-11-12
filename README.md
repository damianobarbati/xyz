# xyz

This is a prototype ESM-first Typescript-first monorepo powered by PNPM, Hono, Zod, Vite, Vitest, Playwright, Biome and
OXC tools.

## Requirements

Dependencies:

- `docker` (eg: `brew install orbstack`)
- `fnm` (eg: `brew install fnm`)

## Development

Setup:

```sh
fnm install
npm install -g corepack
corepack enable
corepack install
pnpm install
cp sample.env .env
pnpm env:down
pnpm env:up
pnpm -F api db:migrate
pnpm -F api db:seed
```

Start:

```sh
pnpm dev
```

API serving at: http://localhost:8080  
Web serving at: http://localhost:3000

Linting and typechecking:

```sh
pnpm lint
```

Unit and integration testing:

```sh
pnpm -r test
```

NFR testing:

```sh
pnpm -F nfr exec playwright install chromium chromium-headless-shell
pnpm -r --parallel build
pnpm -r --parallel start
pnpm -F nfr test:e2e
pnpm -F nfr test:lh
pnpm -F nfr test:load
```

Test images:

```sh
docker build -f packages/api/Dockerfile -t xyz-api .
docker build -f packages/web/Dockerfile -t xyz-web .

sed -E 's/localhost/host.docker.internal/g' sample.env > docker.env
docker run --name xyz-api --rm -ti --add-host=host.docker.internal:host-gateway -p 8080:8080 --env-file docker.env xyz-api
curl --max-time 1 --fail --silent --show-error --output /dev/null http://localhost:8080

docker run --name xyz-web --rm -ti --add-host=host.docker.internal:host-gateway -p 3000:3000 --env-file docker.env xyz-web
curl --max-time 1 --fail --silent --show-error --output /dev/null http://localhost:3000
```

Profiling applications (avg and peak of cpu and heap):

```sh
pnpm -F nfr test:profile
pnpm dlx speedscope .report-nfr-profile/api/api.cpuprofile
pnpm dlx speedscope .report-nfr-profile/api/api.heapprofile
```
